// utils/safeFetchIcal.js
//
// Fetching a URL a HOST typed into a form, from inside the platform's own
// network, is a server-side request forgery primitive. `axios.get(feed.url)`
// with no constraints let a feed point at http://169.254.169.254/ (cloud
// instance metadata), at http://127.0.0.1:6379 (the Redis instance), or at any
// service reachable from the Render private network — and the parsed result was
// then rendered back to the host.
//
// Everything below is a constraint the plain axios call did not have:
//   * https only
//   * DNS resolved FIRST, and every resolved address checked against the
//     private/loopback/link-local ranges, so a hostname that resolves to
//     127.0.0.1 is refused before a socket is opened
//   * redirects followed manually, each hop re-validated (a public host that
//     302s to 169.254.169.254 is the classic bypass), and capped
//   * a wall-clock timeout and a response size cap, so a feed cannot hang the
//     sync loop or exhaust memory

import dns from "node:dns/promises";
import net from "node:net";
import axios from "axios";

export const ICAL_TIMEOUT_MS = Number(process.env.ICAL_FETCH_TIMEOUT_MS || 10000);
export const ICAL_MAX_BYTES = Number(process.env.ICAL_MAX_BYTES || 5 * 1024 * 1024);
const MAX_REDIRECTS = 3;

/** Is this literal IP one nobody outside our network should be able to reach? */
export function isBlockedAddress(ip) {
  const version = net.isIP(ip);
  if (!version) return true; // not an IP at all — refuse rather than guess

  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;              // this-network, private, loopback
    if (a === 169 && b === 254) return true;                        // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;               // private
    if (a === 192 && b === 168) return true;                        // private
    if (a === 100 && b >= 64 && b <= 127) return true;              // carrier-grade NAT
    if (a === 192 && b === 0) return true;                          // IETF protocol assignments
    if (a >= 224) return true;                                      // multicast + reserved
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;               // loopback / unspecified
  if (lower.startsWith("fe80") || lower.startsWith("fec0")) return true; // link/site local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;     // unique local
  if (lower.startsWith("ff")) return true;                          // multicast
  // ::ffff:127.0.0.1 and friends
  const mapped = lower.replace(/^::ffff:/, "");
  if (net.isIP(mapped) === 4) return isBlockedAddress(mapped);
  return false;
}

/** Resolve a hostname and refuse if ANY answer points inside the network. */
async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new Error(`refused: ${hostname} is not a public address`);
    return;
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error(`refused: ${hostname} does not resolve`);
  }

  if (!addresses.length) throw new Error(`refused: ${hostname} does not resolve`);
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new Error(`refused: ${hostname} resolves to the non-public address ${address}`);
    }
  }
}

/** Parse and validate a candidate feed URL. Throws with a host-readable reason. */
export async function assertFetchableIcalUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl));
  } catch {
    throw new Error("refused: not a valid URL");
  }

  // Calendar feeds from Airbnb, Booking.com, VRBO and Google are all https.
  // Allowing http would let a network attacker rewrite a host's availability.
  if (parsed.protocol !== "https:") {
    throw new Error("refused: only https calendar URLs are accepted");
  }
  if (parsed.username || parsed.password) {
    throw new Error("refused: credentials in the URL are not accepted");
  }

  await assertPublicHost(parsed.hostname);
  return parsed;
}

/**
 * GET an iCal feed with SSRF, timeout and size protection.
 * @returns {Promise<string>} the raw ICS body
 */
export async function fetchIcal(rawUrl) {
  let target = await assertFetchableIcalUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await axios.get(target.toString(), {
      responseType: "text",
      timeout: ICAL_TIMEOUT_MS,
      // Followed by hand so every hop is re-validated; axios would follow a
      // redirect into the private network without asking us again.
      maxRedirects: 0,
      maxContentLength: ICAL_MAX_BYTES,
      maxBodyLength: ICAL_MAX_BYTES,
      decompress: true,
      validateStatus: (status) => (status >= 200 && status < 300) || (status >= 300 && status < 400),
      headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1" },
    });

    if (response.status < 300) {
      const body = typeof response.data === "string" ? response.data : String(response.data ?? "");
      if (Buffer.byteLength(body, "utf8") > ICAL_MAX_BYTES) {
        throw new Error("refused: calendar feed is larger than the allowed size");
      }
      return body;
    }

    const location = response.headers?.location;
    if (!location) throw new Error("refused: redirect without a destination");
    target = await assertFetchableIcalUrl(new URL(location, target).toString());
  }

  throw new Error("refused: too many redirects");
}
