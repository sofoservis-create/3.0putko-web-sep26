// Pure rules for the Today dashboard: turns the server summary into ordered,
// filterable task cards with exact deep links. No React, no I/O.
import { firstIncompleteStepId, nextStepTitle } from "../hostListingModel";
import { hostPaths } from "../hostRoutes";
import { formatStayRange } from "../reservations/reservationModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

/** Priority order of the groups (fixed by the plan of record). */
export const TASK_GROUPS = ["setup", "requests", "calendar", "messages", "payouts"];

export const GROUP_COPY = {
  setup: { en: "Finish setup", sk: "Dokončite nastavenie" },
  requests: { en: "Waiting for your reply", sk: "Čaká na vašu odpoveď" },
  calendar: { en: "Calendar needs attention", sk: "Kalendár potrebuje pozornosť" },
  messages: { en: "Unread messages", sk: "Neprečítané správy" },
  payouts: { en: "Payouts", sk: "Výplaty" },
};

const skPlural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

const requirementsLeft = (n, language) =>
  language === "en"
    ? `${n} ${n === 1 ? "item" : "items"} left`
    : `${skPlural(n, "zostáva 1 položka", `zostávajú ${n} položky`, `zostáva ${n} položiek`)}`;

const waitingSince = (iso, language, now) => {
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return "";
  const hours = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 3_600_000));
  if (hours < 1) return t(language, "just now", "práve teraz");
  if (hours < 24) return language === "en" ? `${hours} h ago` : `pred ${hours} h`;
  const days = Math.floor(hours / 24);
  return language === "en" ? `${days} ${days === 1 ? "day" : "days"} ago` : `pred ${days} ${skPlural(days, "dňom", "dňami", "dňami")}`;
};

const listingLabel = (ref, language) => ref?.name || t(language, "Unnamed listing", "Ponuka bez názvu");

export const unreadText = (count, language) =>
  language === "en"
    ? `${count} new ${count === 1 ? "message" : "messages"}`
    : skPlural(count, "1 nová správa", `${count} nové správy`, `${count} nových správ`);

/**
 * Build every task card from the summary. `listingsById` (from the shared
 * listings store) is only used to pick the exact editor step for drafts —
 * the same rule the Listings screen uses to resume a draft.
 *
 * Each task: `{ id, group, tone, title, detail, href, propertyId }` where
 * `propertyId` is null for host-level tasks that no property filter hides.
 */
export const buildTodayTasks = (summary, { language = "sk", listingsById = new Map(), now = new Date() } = {}) => {
  if (!summary) return [];
  const tasks = [];

  /* setup */
  if (summary.setup.counts.total === 0) {
    tasks.push({
      id: "setup:first",
      group: "setup",
      tone: "todo",
      title: t(language, "Add your first listing", "Pridajte prvú ponuku"),
      detail: t(language, "Guests can't find you until a listing is live.", "Kým nie je ponuka zverejnená, hostia vás nenájdu."),
      href: hostPaths.newListing,
      propertyId: null,
    });
  }
  for (const item of summary.setup.items) {
    const listing = listingsById.get(item.listing.id);
    const name = listingLabel(item.listing, language);
    if (item.kind === "ready") {
      tasks.push({
        id: `setup:${item.listing.id}`,
        group: "setup",
        tone: "todo",
        title: t(language, `Publish ${name}`, `Zverejnite ${name}`),
        detail: t(language, "Everything is filled in. Review it and go live.", "Všetko je vyplnené. Skontrolujte a zverejnite."),
        href: hostPaths.listing(item.listing.id, { review: true }),
        propertyId: item.listing.id,
      });
    } else {
      const step = listing ? firstIncompleteStepId(listing) : null;
      const stepTitle = listing ? nextStepTitle(listing, language) : null;
      tasks.push({
        id: `setup:${item.listing.id}`,
        group: "setup",
        tone: "todo",
        title: t(language, `Finish ${name}`, `Dokončite ${name}`),
        detail: [`${item.completionPercent} %`, requirementsLeft(item.missingRequirements.length, language), stepTitle ? `${t(language, "Next", "Ďalej")}: ${stepTitle}` : null]
          .filter(Boolean)
          .join(" · "),
        href: hostPaths.listing(item.listing.id, { step }),
        propertyId: item.listing.id,
      });
    }
  }

  /* requests */
  for (const item of summary.requests.items) {
    const blocked = item.conflicts.length > 0;
    tasks.push({
      id: `request:${item.id}`,
      group: "requests",
      tone: blocked ? "urgent" : "warn",
      title: `${item.guestName} · ${formatStayRange({ startDate: item.checkIn, endDate: item.checkOut }, language)}`,
      detail: `${listingLabel(item.listing, language)} · ${t(language, "asked", "požiadal(a)")} ${waitingSince(item.createdAt, language, now)}${
        blocked ? ` · ${t(language, "dates no longer free", "termín už nie je voľný")}` : ""
      }`,
      href: hostPaths.reservation(item.id),
      propertyId: item.listing.id,
    });
  }

  /* calendar */
  for (const item of summary.calendar.conflicts) {
    const kinds = new Set(item.conflicts.map((conflict) => conflict.kind));
    const source = kinds.has("feed")
      ? t(language, "an imported calendar", "importovaný kalendár")
      : t(language, "your own block", "vaša blokácia");
    tasks.push({
      id: `conflict:${item.reservationId}`,
      group: "calendar",
      tone: "urgent",
      title: t(language, `Double booking: ${item.guestName}`, `Dvojitá rezervácia: ${item.guestName}`),
      detail: `${listingLabel(item.listing, language)} · ${formatStayRange({ startDate: item.checkIn, endDate: item.checkOut }, language)} · ${t(language, "overlaps", "prekrýva sa s")} ${source}`,
      href: hostPaths.listingCalendar(item.listing.id),
      propertyId: item.listing.id,
    });
  }
  for (const item of summary.calendar.feedFailures) {
    tasks.push({
      id: `feed:${item.listing.id}:${item.feedId}`,
      group: "calendar",
      tone: "warn",
      title: t(language, `Calendar link failed: ${item.label || "feed"}`, `Kalendárny odkaz zlyhal: ${item.label || "kanál"}`),
      detail: `${listingLabel(item.listing, language)} · ${
        item.hasImportedDates
          ? t(language, "older imported dates are still in use", "staršie importované dátumy sa stále používajú")
          : t(language, "no dates imported yet", "zatiaľ sa nenaimportovali žiadne dátumy")
      }`,
      href: hostPaths.listingCalendar(item.listing.id),
      propertyId: item.listing.id,
    });
  }

  /* messages */
  for (const item of summary.messages.items) {
    tasks.push({
      id: `message:${item.id}`,
      group: "messages",
      tone: "info",
      title: item.guestName,
      detail: `${listingLabel(item.listing, language)} · ${unreadText(item.unreadCount, language)}`,
      href: hostPaths.conversation(item.id),
      propertyId: item.listing.id,
    });
  }

  /* payouts */
  if (summary.payouts.blocker) {
    const live = summary.payouts.blocker.liveListings;
    tasks.push({
      id: "payouts:not-connected",
      group: "payouts",
      tone: "info",
      title: t(language, "Payouts aren't set up", "Výplaty nie sú nastavené"),
      detail:
        language === "en"
          ? `${live} live ${live === 1 ? "listing has" : "listings have"} no way to be paid yet.`
          : `${skPlural(live, "1 zverejnená ponuka zatiaľ nemá", `${live} zverejnené ponuky zatiaľ nemajú`, `${live} zverejnených ponúk zatiaľ nemá`)} spôsob výplaty.`,
      href: hostPaths.payouts,
      propertyId: null,
    });
  }

  return tasks;
};

/** Property-specific tasks are narrowed; host-level ones always stay. */
export const filterTasks = (tasks, { property = null } = {}) =>
  property ? tasks.filter((task) => task.propertyId === null || task.propertyId === property) : tasks;

/** `[{ group, title, tasks }]` in priority order, empty groups omitted. */
export const groupTasks = (tasks, language) =>
  TASK_GROUPS.map((group) => ({
    group,
    title: GROUP_COPY[group][language === "en" ? "en" : "sk"],
    tasks: tasks.filter((task) => task.group === group),
  })).filter((entry) => entry.tasks.length > 0);

/** The three numbers in the summary strip, each with its source screen. */
export const summaryFigures = (summary, language) =>
  summary
    ? [
        { id: "live", value: summary.setup.counts.live, label: t(language, "Live listings", "Zverejnené ponuky"), href: hostPaths.listings },
        { id: "requests", value: summary.requests.count, label: t(language, "Open requests", "Otvorené žiadosti"), href: hostPaths.reservations({ stage: "request" }) },
        { id: "unread", value: summary.messages.unreadMessages, label: t(language, "Unread messages", "Neprečítané správy"), href: hostPaths.messages() },
      ]
    : [];

const DASHBOARD_ERRORS = {
  forbidden: { en: "Host access is required.", sk: "Vyžaduje sa prístup hostiteľa." },
};

export const dashboardErrorText = (error, language) => {
  const code = error?.code;
  if (code && DASHBOARD_ERRORS[code]) return DASHBOARD_ERRORS[code][language === "en" ? "en" : "sk"];
  if (error?.status === 401) return t(language, "Your session has expired. Please log in again.", "Platnosť relácie vypršala. Prihláste sa znova.");
  return t(language, "Something went wrong. Please try again.", "Niečo sa pokazilo. Skúste to znova.");
};
