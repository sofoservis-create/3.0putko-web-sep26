// utils/rateLimit.js
//
// There was no rate limiting anywhere on this API. Login, registration, password
// reset, booking creation, messaging and the OpenAI-backed /api/chat all
// accepted unlimited requests from a single source, which makes credential
// stuffing, account enumeration, mail flooding and OpenAI cost abuse free.
//
// Backed by the Redis instance the app already connects to, so the counter is
// shared across every Render instance rather than being per-process — a
// per-process counter on a service that scales horizontally is not a limit.
// Redis being unavailable fails OPEN: an outage of a non-essential dependency
// must not take login down with it.
//
// Mounted by PATH in index.js rather than woven into each router, so the policy
// is visible in one place and adding a route does not quietly opt out of it.

import redisClient from "./redis.js";

/**
 * @param {object} options
 *   windowSeconds  how long the bucket lasts
 *   max            requests allowed per key per window
 *   keyPrefix      namespace, so two limiters never share a counter
 *   methods        only limit these HTTP methods (default: all)
 *   keyFn          derives the identity being limited (defaults to client IP)
 */
export function rateLimit({
  windowSeconds = 900,
  max = 10,
  keyPrefix = "rl",
  methods = null,
  keyFn,
} = {}) {
  const limited = methods ? new Set(methods.map((m) => m.toUpperCase())) : null;

  return async function rateLimitMiddleware(req, res, next) {
    if (limited && !limited.has(req.method)) return next();

    try {
      // `req.ip` is only trustworthy because index.js sets `trust proxy`.
      const identity = keyFn ? keyFn(req) : req.ip;
      if (!identity) return next();
      const key = `${keyPrefix}:${identity}`;

      const hits = await redisClient.incr(key);
      if (hits === 1) await redisClient.expire(key, windowSeconds);

      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, max - hits)));

      if (hits > max) {
        const ttl = await redisClient.ttl(key);
        res.setHeader("Retry-After", String(ttl > 0 ? ttl : windowSeconds));
        return res.status(429).json({
          error: "Too many requests. Please wait and try again.",
          code: "rate_limited",
        });
      }

      return next();
    } catch (err) {
      // Fail open, loudly.
      console.error(`[rate-limit] ${keyPrefix} unavailable, allowing request:`, err.message);
      return next();
    }
  };
}

/** Credential endpoints: slow enough that guessing is not worth it. */
export const loginLimiter = rateLimit({
  keyPrefix: "rl:login",
  windowSeconds: 900,
  max: 10,
  methods: ["POST"],
});

/** Registration and password reset: each one sends an email at our expense. */
export const accountLimiter = rateLimit({
  keyPrefix: "rl:account",
  windowSeconds: 3600,
  max: 5,
  methods: ["POST"],
});

/** Booking creation: each one writes a reservation and may mail a host. */
export const bookingLimiter = rateLimit({
  keyPrefix: "rl:booking",
  windowSeconds: 3600,
  max: 20,
  methods: ["POST"],
});

/** Messaging. */
export const messageLimiter = rateLimit({
  keyPrefix: "rl:message",
  windowSeconds: 300,
  max: 30,
  methods: ["POST"],
});

/** Anything that costs money per call — the OpenAI-backed search assistant. */
export const aiLimiter = rateLimit({
  keyPrefix: "rl:ai",
  windowSeconds: 3600,
  max: 20,
  methods: ["POST"],
});
