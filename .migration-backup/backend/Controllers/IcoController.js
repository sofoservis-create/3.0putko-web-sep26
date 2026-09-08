import { lookupCompany } from "../utils/companyLookup.js";

const requests = new Map();
const WINDOW_MS = 60 * 1000;
const LIMIT = 60;

export async function getCompanyByIco(req, res) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const hits = (requests.get(ip) || []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= LIMIT) return res.status(429).json({ error: "RATE_LIMITED" });
  hits.push(now);
  requests.set(ip, hits);

  try {
    return res.json(await lookupCompany(req.params.ico));
  } catch (error) {
    const status = { INVALID_ICO: 400, NOT_FOUND: 404, LOOKUP_UNAVAILABLE: 503 }[error.code] || 500;
    return res.status(status).json({ error: error.code || "LOOKUP_FAILED" });
  }
}
