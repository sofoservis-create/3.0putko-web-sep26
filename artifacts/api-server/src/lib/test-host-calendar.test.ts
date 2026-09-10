import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AccommodationData } from "./test-host-accommodation";
import {
  addDays,
  attemptIsCurrent,
  calendarFeedsNeedIds,
  calendarFeedsOf,
  feedChoiceAfter,
  fetchFeed,
  importOutcome,
  isPublicIp,
  MAX_IMPORTED_RANGES,
  mergeBlockIntoRanges,
  normalizeCalendarFeeds,
  parseIcsRanges,
  resolvePublicAddresses,
  subtractRangeFromBlocks,
  type ResolvedAddress,
  validateDateRange,
  validateFeedUrl,
  validateUnblockRange,
} from "./test-host-calendar.ts";

const TODAY = "2026-09-10";

describe("public address policy", () => {
  it("accepts globally routable addresses", () => {
    for (const address of ["93.184.216.34", "8.8.8.8", "2606:4700::1111", "2a00:1450:4001:80b::200e"]) {
      assert.equal(isPublicIp(address), true, address);
    }
  });

  it("rejects loopback, private, link-local, CGNAT and tunnelled addresses", () => {
    for (const address of [
      "127.0.0.1",
      "127.8.8.8",
      "10.0.0.5",
      "172.16.9.1",
      "172.31.255.254",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.1.1",
      "0.0.0.0",
      "255.255.255.255",
      "224.0.0.1",
      "::1",
      "::",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "::ffff:10.0.0.1",
      "::127.0.0.1",
      "64:ff9b::7f00:1",
      "fd00::1",
      "fc00::abcd",
      "fe80::1",
      "fe80::1%eth0",
      "ff02::1",
      "2002:7f00:0001::",
      "2001:0:0:0:0:0:80ff:fffe",
      "2001:db8::1",
    ]) {
      assert.equal(isPublicIp(address), false, address);
    }
  });

  it("rejects garbage", () => {
    for (const address of ["", "example.com", "1.2.3", "1.2.3.4.5", "999.1.1.1", ":::1", "g::1"]) {
      assert.equal(isPublicIp(address), false, address);
    }
  });
});

describe("validateFeedUrl", () => {
  it("accepts public http(s) links", () => {
    assert.deepEqual(validateFeedUrl("https://calendar.google.com/x.ics"), {
      url: "https://calendar.google.com/x.ics",
    });
    assert.deepEqual(validateFeedUrl("http://93.184.216.34/a.ics"), { url: "http://93.184.216.34/a.ics" });
  });

  it("rejects non-http schemes and credentials", () => {
    assert.deepEqual(validateFeedUrl("webcal://example.com/x.ics"), { error: "unsupportedScheme" });
    assert.deepEqual(validateFeedUrl("ftp://example.com/x.ics"), { error: "unsupportedScheme" });
    assert.deepEqual(validateFeedUrl("https://user:pw@example.com/x.ics"), { error: "invalidUrl" });
    assert.deepEqual(validateFeedUrl("not a url"), { error: "invalidUrl" });
    assert.deepEqual(validateFeedUrl(""), { error: "empty" });
  });

  it("rejects literal private, loopback and mapped addresses in every notation", () => {
    for (const url of [
      "http://localhost/x.ics",
      "http://127.0.0.1/x.ics",
      "http://2130706433/x.ics", // decimal 127.0.0.1, normalised by the URL parser
      "http://0x7f000001/x.ics",
      "http://[::1]/x.ics",
      "http://[::ffff:127.0.0.1]/x.ics",
      "http://[::ffff:7f00:1]/x.ics",
      "http://[fd12:3456::1]/x.ics",
      "http://[fe80::1]/x.ics",
      "http://169.254.169.254/latest/meta-data",
      "http://10.1.2.3/x.ics",
      "http://192.168.0.10/x.ics",
      "http://metadata/x.ics",
      "http://printer.local/x.ics",
      "http://db.internal/x.ics",
    ]) {
      assert.deepEqual(validateFeedUrl(url), { error: "privateHost" }, url);
    }
  });
});

describe("resolvePublicAddresses", () => {
  const lookupFor =
    (answers: Array<{ address: string; family: number }>) =>
    (async () => answers) as unknown as Parameters<typeof resolvePublicAddresses>[1];

  it("returns every public answer so the fetch can pin them", async () => {
    const result = await resolvePublicAddresses(
      "example.com",
      lookupFor([
        { address: "93.184.216.34", family: 4 },
        { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
      ]),
    );
    assert.deepEqual(result, [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
  });

  it("refuses a name with any private answer (rebinding / split-horizon)", async () => {
    const result = await resolvePublicAddresses(
      "evil.example.com",
      lookupFor([
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]),
    );
    assert.equal(result, null);
  });

  it("refuses names that resolve to nothing or fail", async () => {
    assert.equal(await resolvePublicAddresses("nx.example.com", lookupFor([])), null);
    const failing = (async () => {
      throw new Error("ENOTFOUND");
    }) as unknown as Parameters<typeof resolvePublicAddresses>[1];
    assert.equal(await resolvePublicAddresses("nx.example.com", failing), null);
  });

  it("never consults DNS for literal or forbidden hosts", async () => {
    let calls = 0;
    const counting = (async () => {
      calls += 1;
      return [{ address: "93.184.216.34", family: 4 }];
    }) as unknown as Parameters<typeof resolvePublicAddresses>[1];
    assert.equal(await resolvePublicAddresses("127.0.0.1", counting), null);
    assert.equal(await resolvePublicAddresses("localhost", counting), null);
    assert.deepEqual(await resolvePublicAddresses("93.184.216.34", counting), [
      { address: "93.184.216.34", family: 4 },
    ]);
    assert.equal(calls, 0);
  });
});

describe("fetchFeed redirect handling", () => {
  const ICS = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261001\nDTEND;VALUE=DATE:20261003\nEND:VEVENT\nEND:VCALENDAR\n";
  const publicLookup = (async (hostname: string) => {
    if (hostname.startsWith("private")) return [{ address: "10.0.0.9", family: 4 }];
    return [{ address: "93.184.216.34", family: 4 }];
  }) as unknown as Parameters<typeof resolvePublicAddresses>[1];

  const fakeRequest =
    (script: Record<string, { location?: string; text?: string }>) =>
    async (target: URL, addresses: ResolvedAddress[], _deadline: number) => {
      // Every hop must be pinned to a validated public address.
      for (const entry of addresses) assert.equal(isPublicIp(entry.address), true, entry.address);
      const step = script[target.toString()];
      assert.ok(step, `unexpected request to ${target}`);
      if (step.location) return { kind: "redirect" as const, location: step.location };
      return { kind: "body" as const, text: step.text ?? "" };
    };

  it("follows a public redirect and imports the feed", async () => {
    const result = await fetchFeed("https://a.example.com/x.ics", {
      lookup: publicLookup,
      request: fakeRequest({
        "https://a.example.com/x.ics": { location: "https://b.example.com/y.ics" },
        "https://b.example.com/y.ics": { text: ICS },
      }),
    });
    assert.deepEqual(result, {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-02", summary: null }],
    });
  });

  it("stops at a redirect to a private host or literal", async () => {
    let touchedPrivate = false;
    const script = fakeRequest({
      "https://a.example.com/x.ics": { location: "http://169.254.169.254/latest" },
      "https://c.example.com/x.ics": { location: "http://private.example.com/x.ics" },
    });
    const request = async (target: URL, addresses: ResolvedAddress[], deadline: number) => {
      if (target.hostname === "169.254.169.254" || target.hostname.startsWith("private")) touchedPrivate = true;
      return script(target, addresses, deadline);
    };
    assert.deepEqual(await fetchFeed("https://a.example.com/x.ics", { lookup: publicLookup, request }), {
      ok: false,
      error: "privateHost",
    });
    assert.deepEqual(await fetchFeed("https://c.example.com/x.ics", { lookup: publicLookup, request }), {
      ok: false,
      error: "privateHost",
    });
    assert.equal(touchedPrivate, false);
  });

  it("rejects redirects to other schemes and redirect loops", async () => {
    assert.deepEqual(
      await fetchFeed("https://a.example.com/x.ics", {
        lookup: publicLookup,
        request: fakeRequest({ "https://a.example.com/x.ics": { location: "file:///etc/passwd" } }),
      }),
      { ok: false, error: "privateHost" },
    );
    assert.deepEqual(
      await fetchFeed("https://a.example.com/x.ics", {
        lookup: publicLookup,
        request: fakeRequest({ "https://a.example.com/x.ics": { location: "/x.ics" } }),
      }),
      { ok: false, error: "tooManyRedirects" },
    );
  });

  it("refuses to start when the host resolves privately", async () => {
    let requested = false;
    const result = await fetchFeed("https://private.example.com/x.ics", {
      lookup: publicLookup,
      request: async () => {
        requested = true;
        return { kind: "body", text: ICS };
      },
    });
    assert.deepEqual(result, { ok: false, error: "privateHost" });
    assert.equal(requested, false);
  });

  it("reports a non-calendar body honestly", async () => {
    assert.deepEqual(
      await fetchFeed("https://a.example.com/x.ics", {
        lookup: publicLookup,
        request: fakeRequest({ "https://a.example.com/x.ics": { text: "<html>nope</html>" } }),
      }),
      { ok: false, error: "notCalendar" },
    );
  });
});

describe("date ranges", () => {
  it("block requests are capped at 400 days", () => {
    assert.deepEqual(validateDateRange({ startDate: "2026-10-01", endDate: "2027-11-04" }, TODAY), { range: { startDate: "2026-10-01", endDate: "2027-11-04" } });
    assert.deepEqual(validateDateRange({ startDate: "2026-10-01", endDate: "2027-11-05" }, TODAY), { error: "tooLong" });
  });

  it("merging two valid blocks may exceed 400 days and unblocking the whole result still works", () => {
    const first = { id: "a", startDate: "2026-10-01", endDate: "2027-11-04" };
    const { merged } = mergeBlockIntoRanges([first], { startDate: "2027-11-05", endDate: "2027-12-01" });
    assert.deepEqual(merged, { startDate: "2026-10-01", endDate: "2027-12-01" });
    const validated = validateUnblockRange(merged, TODAY);
    assert.deepEqual(validated, { range: merged });
    const { remove, insert } = subtractRangeFromBlocks([{ id: "m", ...merged }], merged);
    assert.deepEqual(remove.map((block) => block.id), ["m"]);
    assert.deepEqual(insert, []);
  });

  it("unblocking a block that started in the past keeps the past nights", () => {
    const validated = validateUnblockRange({ startDate: "2026-09-01", endDate: "2026-09-15" }, TODAY);
    assert.deepEqual(validated, { range: { startDate: "2026-09-09", endDate: "2026-09-15" } });
    const { remove, insert } = subtractRangeFromBlocks(
      [{ id: "p", startDate: "2026-09-01", endDate: "2026-09-15" }],
      (validated as { range: { startDate: string; endDate: string } }).range,
    );
    assert.deepEqual(remove.map((block) => block.id), ["p"]);
    assert.deepEqual(insert, [{ startDate: "2026-09-01", endDate: "2026-09-08" }]);
  });

  it("unblock still rejects malformed, reversed and fully past ranges", () => {
    assert.deepEqual(validateUnblockRange({ startDate: "2026-9-1", endDate: "2026-09-15" }, TODAY), { error: "invalidDate" });
    assert.deepEqual(validateUnblockRange({ startDate: "2026-09-15", endDate: "2026-09-14" }, TODAY), { error: "endBeforeStart" });
    assert.deepEqual(validateUnblockRange({ startDate: "2026-09-01", endDate: "2026-09-08" }, TODAY), { error: "inPast" });
    assert.deepEqual(validateUnblockRange({ startDate: "2030-01-01", endDate: "2030-01-02" }, TODAY), { error: "tooFarAhead" });
  });
});

describe("parseIcsRanges", () => {
  const wrap = (...events: string[]) =>
    ["BEGIN:VCALENDAR", "VERSION:2.0", ...events.flatMap((event) => ["BEGIN:VEVENT", event, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");

  it("treats DTEND as exclusive, skips cancelled events and unfolds lines", () => {
    const text = [
      "\uFEFFBEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20261001",
      "DTEND;VALUE=DATE:20261004",
      "SUMMARY:Reserved",
      "  (Airbnb)",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART:20261110T140000Z",
      "STATUS:CANCELLED",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART:20261201T150000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    assert.deepEqual(parseIcsRanges(text), {
      ok: true,
      ranges: [
        { startDate: "2026-10-01", endDate: "2026-10-03", summary: "Reserved (Airbnb)" },
        { startDate: "2026-12-01", endDate: "2026-12-01", summary: null },
      ],
    });
    assert.deepEqual(parseIcsRanges("hello"), { ok: false, error: "notCalendar" });
    assert.deepEqual(parseIcsRanges(wrap()), { ok: true, ranges: [] });
  });

  it("refuses truncated downloads instead of importing an empty calendar", () => {
    assert.deepEqual(parseIcsRanges("BEGIN:VCALENDAR\nVERSION:2.0\n"), { ok: false, error: "incomplete" });
    const cut = wrap("DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261004").replace(/\r\nEND:VEVENT\r\nEND:VCALENDAR$/, "");
    assert.deepEqual(parseIcsRanges(cut), { ok: false, error: "incomplete" });
    const noCalendarEnd = wrap("DTSTART;VALUE=DATE:20261001").replace(/END:VCALENDAR$/, "");
    assert.deepEqual(parseIcsRanges(noCalendarEnd), { ok: false, error: "incomplete" });
  });

  it("refuses repeating events rather than importing only the first occurrence", () => {
    assert.deepEqual(
      parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261002\r\nRRULE:FREQ=DAILY;COUNT=3")),
      { ok: false, error: "unsupportedRecurrence" },
    );
    assert.deepEqual(
      parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nRDATE;VALUE=DATE:20261005,20261009")),
      { ok: false, error: "unsupportedRecurrence" },
    );
  });

  it("refuses events whose dates it cannot read", () => {
    assert.deepEqual(parseIcsRanges(wrap("SUMMARY:No start")), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;TZID=Europe/Bratislava:2026-10-01")), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:2026100")), { ok: false, error: "unreadable" });
    // A local time with TZID is still a readable calendar date.
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;TZID=Europe/Bratislava:20261001T150000\r\nDTEND;TZID=Europe/Bratislava:20261003T100000")), {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-02", summary: null }],
    });
  });
});
describe("parseIcsRanges — DURATION and event order", () => {
  const wrap = (...events: string[]) =>
    ["BEGIN:VCALENDAR", ...events.flatMap((event) => ["BEGIN:VEVENT", event, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");

  it("blocks the whole stay when the event uses DURATION instead of DTEND", () => {
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDURATION:P3D")), {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-03", summary: null }],
    });
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDURATION:P1W")), {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-07", summary: null }],
    });
    // Timed: 1 Oct 14:00 + 2 days 20 hours ends 4 Oct 10:00 → the 4th is free.
    assert.deepEqual(parseIcsRanges(wrap("DTSTART:20261001T140000Z\r\nDURATION:P2DT20H")), {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-03", summary: null }],
    });
    // A two-hour event stays a one-day block, like a same-day DTEND.
    assert.deepEqual(parseIcsRanges(wrap("DTSTART:20261001T150000\r\nDURATION:PT2H")), {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-01", summary: null }],
    });
    // Timed event crossing midnight by duration blocks both nights' days.
    assert.deepEqual(parseIcsRanges(wrap("DTSTART:20261001T230000\r\nDURATION:PT26H")), {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-02", summary: null }],
    });
  });

  it("refuses durations it cannot trust", () => {
    for (const duration of ["-P1D", "P", "PT", "P1X", "1D", "P1DT"]) {
      assert.deepEqual(parseIcsRanges(wrap(`DTSTART;VALUE=DATE:20261001\r\nDURATION:${duration}`)), { ok: false, error: "unreadable" }, duration);
    }
    // All-day starts may only carry whole days/weeks (RFC 5545).
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDURATION:PT36H")), { ok: false, error: "unreadable" });
    // DTEND and DURATION together are contradictory.
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261003\r\nDURATION:P1D")), { ok: false, error: "unreadable" });
  });

  it("refuses a corrupt property line instead of treating it as absent", () => {
    // A DTEND whose separator is broken must not shorten the stay to one day.
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE=20261005")), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261005\r\ngarbage line")), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges("BEGIN:VCALENDAR\nPRODID\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261001\nEND:VEVENT\nEND:VCALENDAR"), { ok: false, error: "unreadable" });
  });

  it("refuses contradictory repeated date or status properties instead of picking one", () => {
    const start = "DTSTART;VALUE=DATE:20261001";
    assert.deepEqual(parseIcsRanges(wrap(`${start}\r\nDTEND;VALUE=DATE:20261002\r\nDTEND;VALUE=DATE:20261008`)), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap(`${start}\r\nDTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261008`)), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap(`${start}\r\nDURATION:P1D\r\nDURATION:P7D`)), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap(`${start}\r\nSTATUS:CONFIRMED\r\nSTATUS:CANCELLED`)), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap(`${start}\r\nSTATUS:CANCELLED\r\nSTATUS:CONFIRMED`)), { ok: false, error: "unreadable" });
    // Genuinely repeatable properties (and vendor extensions) are fine.
    assert.deepEqual(parseIcsRanges(wrap(`${start}\r\nDTEND;VALUE=DATE:20261003\r\nCATEGORIES:A\r\nCATEGORIES:B\r\nATTENDEE:mailto:a@example.com\r\nATTENDEE:mailto:b@example.com\r\nX-FOO:1\r\nX-FOO:2`)), {
      ok: true,
      ranges: [{ startDate: "2026-10-01", endDate: "2026-10-02", summary: null }],
    });
  });

  it("refuses absurd durations and unrepresentable dates without throwing", () => {
    for (const duration of ["P99999999999999999999D", "P999999W", "P3661D", "PT999999H"]) {
      assert.deepEqual(parseIcsRanges(wrap(`DTSTART:20261001T000000Z\r\nDURATION:${duration}`)), { ok: false, error: "unreadable" }, duration);
    }
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:99991230\r\nDURATION:P30D")), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20371002")), { ok: false, error: "unreadable" });
    // Ten years is still accepted.
    assert.equal(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261001\r\nDURATION:P3650D")).ok, true);
  });

  it("refuses events that end before they start instead of guessing one day", () => {
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261001")), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(wrap("DTSTART:20261005T150000Z\r\nDTEND:20261005T100000Z")), { ok: false, error: "unreadable" });
    // Zero-length and same-day-later ends are still one-day blocks.
    assert.deepEqual(parseIcsRanges(wrap("DTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261005")), {
      ok: true,
      ranges: [{ startDate: "2026-10-05", endDate: "2026-10-05", summary: null }],
    });
  });
});

describe("parseIcsRanges — component structure", () => {
  it("reads names case-insensitively, so lowercase events are imported, not skipped", () => {
    const text = [
      "begin:vcalendar",
      "Begin:vEvent",
      "dtstart;value=date:20261001",
      "dtend;value=date:20261003",
      "summary:lower",
      "end:vevent",
      "END:VCALENDAR",
    ].join("\n");
    assert.deepEqual(parseIcsRanges(text), { ok: true, ranges: [{ startDate: "2026-10-01", endDate: "2026-10-02", summary: "lower" }] });
    assert.deepEqual(parseIcsRanges("BEGIN:VCALENDAR\nbegin:vevent\nDTSTART;VALUE=DATE:20261001\nEND:VCALENDAR"), { ok: false, error: "incomplete" });
  });

  it("requires every calendar in the download to be complete", () => {
    const complete = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261001\nEND:VEVENT\nEND:VCALENDAR";
    assert.deepEqual(parseIcsRanges(`${complete}\n${complete}`), {
      ok: true,
      ranges: [
        { startDate: "2026-10-01", endDate: "2026-10-01", summary: null },
        { startDate: "2026-10-01", endDate: "2026-10-01", summary: null },
      ],
    });
    assert.deepEqual(parseIcsRanges(`${complete}\nBEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261101`), { ok: false, error: "incomplete" });
    assert.deepEqual(parseIcsRanges(`${complete}\nBEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261101\nEND:VEVENT`), { ok: false, error: "incomplete" });
    // An END that closes nothing, or garbage between calendars, is corruption.
    assert.deepEqual(parseIcsRanges(`${complete}\nEND:VCALENDAR`), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges(`${complete}\n<html>`), { ok: false, error: "unreadable" });
    assert.deepEqual(parseIcsRanges("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261001\nEND:VTODO\nEND:VCALENDAR"), { ok: false, error: "unreadable" });
  });

  it("ignores alarms and other components nested in or beside events", () => {
    const text = [
      "BEGIN:VCALENDAR",
      "BEGIN:VTIMEZONE",
      "TZID:Europe/Bratislava",
      "BEGIN:STANDARD",
      "DTSTART:19701025T030000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20261001",
      "DTEND;VALUE=DATE:20261002",
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "SUMMARY:Alarm, not the event",
      "DTSTART:19700101T000000Z",
      "END:VALARM",
      "SUMMARY:Stay",
      "END:VEVENT",
      "BEGIN:VTODO",
      "DTSTART;VALUE=DATE:20261201",
      "END:VTODO",
      "END:VCALENDAR",
    ].join("\r\n");
    assert.deepEqual(parseIcsRanges(text), { ok: true, ranges: [{ startDate: "2026-10-01", endDate: "2026-10-01", summary: "Stay" }] });
  });
});

describe("attemptIsCurrent", () => {
  const t0 = new Date("2026-09-10T10:00:00Z");
  const t1 = new Date("2026-09-10T10:00:01Z");

  it("applies attempts in start order regardless of arrival order", () => {
    // Nothing recorded yet, or an older/equal attempt recorded: apply.
    assert.equal(attemptIsCurrent(t1, null), true);
    assert.equal(attemptIsCurrent(t1, undefined), true);
    assert.equal(attemptIsCurrent(t1, t0), true);
    assert.equal(attemptIsCurrent(t1, new Date(t1)), true);
    // A later-started attempt already recorded: the older result is dropped.
    assert.equal(attemptIsCurrent(t0, t1), false);
  });
});

describe("importOutcome", () => {
  const today = "2026-09-10";
  const range = (startDate: string, endDate = startDate) => ({ startDate, endDate, summary: null });

  it("keeps the last import on any fetch or parse failure", () => {
    // End to end through the reader: a contradictory or truncated calendar
    // never becomes a "replace" decision, so the stored blocks stay as they are.
    const contradictory = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261001\nDTEND;VALUE=DATE:20261002\nDTEND;VALUE=DATE:20261008\nEND:VEVENT\nEND:VCALENDAR";
    assert.deepEqual(importOutcome(parseIcsRanges(contradictory), today), { kind: "failed", error: "unreadable" });
    assert.deepEqual(importOutcome(parseIcsRanges("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261001"), today), { kind: "failed", error: "incomplete" });
    assert.deepEqual(importOutcome({ ok: false, error: "incomplete" }, today), { kind: "failed", error: "incomplete" });
    assert.deepEqual(importOutcome({ ok: false, error: "http_404" }, today), { kind: "failed", error: "http_404" });
  });

  it("replaces with current and future ranges, sorted, dropping the past", () => {
    const result = importOutcome(
      { ok: true, ranges: [range("2026-12-01", "2026-12-03"), range("2026-01-01", "2026-01-05"), range("2026-09-08", "2026-09-09"), range("2026-10-01")] },
      today,
    );
    assert.deepEqual(result, {
      kind: "replace",
      ranges: [range("2026-09-08", "2026-09-09"), range("2026-10-01"), range("2026-12-01", "2026-12-03")],
    });
    assert.deepEqual(importOutcome({ ok: true, ranges: [] }, today), { kind: "replace", ranges: [] });
  });

  it("fails an export too large to store instead of truncating it", () => {
    const many = Array.from({ length: MAX_IMPORTED_RANGES + 1 }, (_, i) => range(addDays("2026-10-01", i * 2)));
    assert.deepEqual(importOutcome({ ok: true, ranges: many }, today), { kind: "failed", error: "tooManyEvents" });
    const justEnough = many.slice(1);
    assert.equal(importOutcome({ ok: true, ranges: justEnough }, today).kind, "replace");
    // Past ranges do not count against the limit.
    const withPast = [...justEnough, range("2020-01-01"), range("2021-01-01")];
    assert.equal(importOutcome({ ok: true, ranges: withPast }, today).kind, "replace");
  });
});

describe("feedChoiceAfter", () => {
  const connected = { calendarChoice: "connect" } as AccommodationData;
  const paused = { calendarChoice: "none" } as AccommodationData;
  const unset = {} as AccommodationData;

  it("connects when a link is added, whatever the mode was", () => {
    assert.equal(feedChoiceAfter(connected, 1, "add"), "connect");
    assert.equal(feedChoiceAfter(paused, 3, "add"), "connect");
    assert.equal(feedChoiceAfter(unset, 1, "add"), "connect");
  });

  it("keeps a paused listing paused when links are edited or removed", () => {
    assert.equal(feedChoiceAfter(paused, 2, "edit"), "none");
    assert.equal(feedChoiceAfter(paused, 1, "remove"), "none");
    assert.equal(feedChoiceAfter(paused, 0, "remove"), "none");
    assert.equal(feedChoiceAfter(unset, 1, "edit"), null);
  });

  it("keeps a connected listing connected until its last link goes", () => {
    assert.equal(feedChoiceAfter(connected, 2, "edit"), "connect");
    assert.equal(feedChoiceAfter(connected, 1, "remove"), "connect");
    assert.equal(feedChoiceAfter(connected, 0, "remove"), "none");
  });
});

describe("legacy Step 8 feed definitions", () => {
  it("are detected and given stable ids without losing any entry", () => {
    const data = {
      calendarChoice: "connect",
      calendarFeeds: [
        { label: "Airbnb", url: "https://example.com/a.ics" },
        { id: "keep-me", label: "Booking", url: "https://example.com/b.ics" },
        "garbage",
      ],
    };
    assert.equal(calendarFeedsNeedIds(data), true);
    // Reading without normalising would hide the legacy entry.
    assert.deepEqual(calendarFeedsOf(data).map((feed) => feed.label), ["Booking"]);

    const normalized = normalizeCalendarFeeds(data);
    assert.equal(calendarFeedsNeedIds(normalized), false);
    const feeds = calendarFeedsOf(normalized);
    assert.deepEqual(feeds.map((feed) => feed.label), ["Airbnb", "Booking"]);
    assert.equal(feeds[1].id, "keep-me");
    assert.match(feeds[0].id, /^[0-9a-f-]{36}$/);
    // Normalising is idempotent: ids never change once assigned.
    assert.deepEqual(normalizeCalendarFeeds(normalized), normalized);
    assert.equal(calendarFeedsNeedIds({ calendarChoice: "none" }), false);
  });
});
