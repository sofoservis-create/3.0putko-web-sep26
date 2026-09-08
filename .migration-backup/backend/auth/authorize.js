// auth/authorize.js
//
// Authentication and ownership for the money-handling routes.
//
// Before this existed, `/api/payments/*`, `/api/cancellation/*`, `/api/receipts/*`
// and `/api/dac7/*` were completely unauthenticated. With nothing but a
// reservation id, anyone could refund someone else's booking in full
// (`cancelledBy: "host"`), force a payout, download a guest's receipt, or pull
// the DAC7 export — every host's name, tax ID, address and annual revenue.
//
// Three token shapes are in circulation, all signed with the same secret:
//   guest  { id, role: 'guest' }   issued by authController
//   host   { id, role: 'host'  }   issued by authController
//   admin  { adminId, role: 'superadmin' } issued by AdminController
// `verifyToken.authenticate` only understood the first two, so admin tokens
// arrived with `req.userId === undefined`. This module normalises all three.

import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Host from "../models/Host.js";
import Admin from "../models/Admin.js";
import Reservation from "../models/Reservation.js";
import Accommodation from "../models/Accommodation.js";

/** Decode without asserting anything about who the caller is. */
function decode(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET_KEY);
  } catch {
    return null;
  }
}

/**
 * Populates `req.auth = { id, role, kind }` where kind is 'guest' | 'host' | 'admin'.
 * Attaches nothing and does not reject when there is no valid token — use
 * `requireAuth` for that.
 */
export async function identify(req, _res, next) {
  const claims = decode(req);
  if (!claims) return next();

  const id = claims.adminId || claims.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return next();

  // Compared case- and whitespace-insensitively. `role` is a free-text column on
  // documents that predate the enum, so a stored "Host" or " host " decoded into
  // a claim that matched none of these and silently fell through to "guest" —
  // locking a real host out of every host-only route with "You may only manage
  // your own payout account", which describes the wrong problem entirely.
  const role = String(claims.role || "").trim().toLowerCase();

  const kind = claims.adminId
    ? "admin"
    : role === "host"
      ? "host"
      : role === "admin" || role === "superadmin"
        ? "admin"
        : "guest";

  req.auth = { id: String(id), role: claims.role, kind };

  // Legacy fields, so anything already reading them keeps working.
  req.userId = String(id);
  req.role = claims.role;

  next();
}

/** Reject anyone without a valid token. */
export const requireAuth = [
  identify,
  (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  },
];

/** Reject anyone who is not an admin. */
export const requireAdmin = [
  identify,
  async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.auth.kind !== "admin") {
      return res.status(403).json({ error: "Administrator access required" });
    }

    // The claim is not enough — confirm the account still exists and is still
    // an admin, so a revoked account cannot keep using an unexpired token.
    const admin =
      (await Admin.findById(req.auth.id)) ||
      (await User.findOne({ _id: req.auth.id, role: "admin" })) ||
      (await Host.findOne({ _id: req.auth.id, role: "admin" }));

    if (!admin) {
      return res.status(403).json({ error: "Administrator access required" });
    }

    req.admin = admin;
    next();
  },
];

/**
 * Admin-only, except on a completely fresh installation where no admin exists
 * yet — otherwise locking down `/admin/register` would make it impossible to
 * create the first one. The exemption disappears the moment one account exists.
 */
export const requireAdminOrBootstrap = [
  identify,
  async (req, res, next) => {
    const adminCount = await Admin.estimatedDocumentCount();

    if (adminCount === 0) {
      console.warn("[auth] no admin exists yet — allowing bootstrap registration");
      return next();
    }

    return requireAdmin[1](req, res, next);
  },
];

/**
 * True when this caller is the host who owns the listing behind a reservation.
 *
 * Ownership is decided by the DATA — the booking's provider, or the listing's
 * owner — not by the token's `role` claim. This used to short-circuit on
 * `auth.kind !== "host"`, which meant a host carrying a stale or legacy role
 * claim (see requireHostSelf for why those exist) was refused access to their
 * own booking with "You do not have access to this reservation". That blocked
 * Withdraw for the same hosts the payout settings page was locking out.
 *
 * The claim is still not simply ignored: a caller who matches on id must also
 * BE a Host record, so a guest whose id somehow appeared on a listing cannot
 * inherit host powers.
 */
async function isOwningHost(auth, reservation) {
  let owns = String(reservation.accommodationProvider || "") === auth.id;

  if (!owns) {
    const listing = await Accommodation.findById(
      reservation.accommodationId?._id || reservation.accommodationId
    ).select("userId");

    owns = String(listing?.userId || "") === auth.id;
  }

  if (!owns) return false;
  if (auth.kind === "host") return true;

  return Boolean(await Host.exists({ _id: auth.id }));
}

/**
 * True when this caller is the guest who made the booking.
 *
 * No `auth.kind` pre-check: the lookup below is the real test, and it already
 * fails closed for a non-guest — a Host id finds no User, so `user` is null.
 * Testing the claim first only added the same false-negative isOwningHost had.
 */
async function isBookingGuest(auth, reservation) {
  // Reservations carry no guest user id — guests can book without an account —
  // so identity is matched on the email the booking was made with.
  const user = await User.findById(auth.id).select("email");
  if (!user?.email || !reservation.email) return false;

  return user.email.trim().toLowerCase() === reservation.email.trim().toLowerCase();
}

/** Constant-time comparison, so a token cannot be recovered by timing. */
function tokenMatches(supplied, stored) {
  if (!supplied || !stored) return false;

  const a = Buffer.from(String(supplied));
  const b = Buffer.from(String(stored));
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/** The booking's own capability token, from a header or the body. */
function suppliedReservationToken(req) {
  return (
    req.headers["x-reservation-token"] ||
    req.body?.reservationToken ||
    req.query?.reservationToken ||
    null
  );
}

/**
 * Loads `req.reservation` and asserts the caller may act on it.
 *
 * Access is granted by EITHER a bearer token whose owner is connected to the
 * booking, OR the booking's own `accessToken` — guests can book without an
 * account, so an anonymous guest has nothing else to prove with. The capability
 * token only ever grants guest-level rights, never host or admin ones.
 *
 * @param {object} options
 *   allow   which roles may pass: any of 'guest' | 'host' | 'admin'
 *   param   route param holding the reservation id
 *   source  'params' | 'body'
 */
export function requireReservationAccess({
  allow = ["guest", "host", "admin"],
  param = "reservationId",
  source = "params",
} = {}) {
  return [
    identify,
    async (req, res, next) => {
      try {
        const reservationId = req[source]?.[param];

        if (!reservationId || !mongoose.Types.ObjectId.isValid(reservationId)) {
          return res.status(400).json({ error: "Valid reservation ID required" });
        }

        // Refuse before touching the database when the caller presented no
        // credentials at all. Looking the booking up first turned this into an
        // enumeration oracle: a real id answered 401, an invented one 404,
        // which is enough to walk the reservation collection.
        if (!req.auth && !suppliedReservationToken(req)) {
          return res
            .status(401)
            .json({ error: "Authentication or a reservation token is required" });
        }

        const reservation = await Reservation.findById(reservationId).select("+accessToken");
        if (!reservation) {
          return res.status(404).json({ error: "Reservation not found" });
        }

        const isAdmin = req.auth?.kind === "admin";

        const viaCapability =
          allow.includes("guest") &&
          tokenMatches(suppliedReservationToken(req), reservation.accessToken);

        // WHICH grant succeeded, not merely whether one did.
        //
        // `actorRole` used to be re-derived afterwards from `req.auth.kind` —
        // the same claim that could be wrong. A host whose token said "guest"
        // therefore acted as a guest even once admitted, and CancellationController
        // reads this to decide `cancelledBy`: a host cancelling their own booking
        // would have been recorded as the GUEST cancelling, which selects a
        // different refund tier and pays out the wrong amount. Deriving it from
        // the grant that actually passed makes the two impossible to disagree.
        //
        // Precedence is unchanged: admin, then the booking's capability token,
        // then owning host, then the booking's guest.
        let grantedAs = null;

        if (req.auth && isAdmin && allow.includes("admin")) {
          grantedAs = "admin";
        } else if (viaCapability) {
          grantedAs = "guest";
        } else if (
          req.auth &&
          allow.includes("host") &&
          (await isOwningHost(req.auth, reservation))
        ) {
          grantedAs = "host";
        } else if (
          req.auth &&
          allow.includes("guest") &&
          (await isBookingGuest(req.auth, reservation))
        ) {
          grantedAs = "guest";
        }

        if (!grantedAs) {
          return res.status(req.auth || viaCapability ? 403 : 401).json({
            error: req.auth
              ? "You do not have access to this reservation"
              : "Authentication or a reservation token is required",
          });
        }

        req.reservation = reservation;
        // So controllers can enforce "a guest may not cancel as the host".
        req.actorRole = grantedAs;
        next();
      } catch (err) {
        console.error("requireReservationAccess error:", err);
        res.status(500).json({ error: err.message });
      }
    },
  ];
}

/**
 * Asserts the caller is the host identified by `param`, or an admin.
 * Used for the Stripe onboarding endpoints, which would otherwise let anyone
 * create or inspect a connected account for any host id they can guess.
 */
export function requireHostSelf({ param = "hostId", source = "body" } = {}) {
  return [
    ...requireAuth,
    async (req, res, next) => {
      const hostId = req[source]?.[param];

      if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
        return res.status(400).json({ error: "Valid hostId required" });
      }
      if (req.auth.kind === "admin") return next();

      // The security property is that a caller may only act on the host id that
      // is THEIR OWN id. That is checked here and is not negotiable.
      if (req.auth.id !== String(hostId)) {
        return res.status(403).json({
          error: "You may only manage your own payout account",
          code: "not_your_account",
        });
      }

      // Beyond that, the `role` claim is only a hint, and it used to be the
      // whole decision. Tokens live for 30 days, so a host who was upgraded from
      // a guest account — or whose Host document carries a legacy role value —
      // is carrying a claim that no longer describes them, and every host route
      // answered "You may only manage your own payout account" about an account
      // that WAS theirs. The claim cannot be refreshed without forcing a
      // re-login, so confirm against the collection instead: the caller is a
      // host if a Host document with their id exists.
      if (req.auth.kind === "host") return next();

      // Express 4 does not catch a rejected promise from async middleware — the
      // request would hang rather than answer. A lookup failure denies, which is
      // the safe direction, and says so rather than timing out.
      let host = null;
      try {
        host = await Host.findById(hostId).select("_id").lean();
      } catch (err) {
        console.error("[auth] host lookup failed:", err.message);
        return res.status(503).json({
          error: "We could not verify your account just now. Please try again.",
          code: "auth_lookup_failed",
        });
      }

      if (host) return next();

      // Genuinely not a host account — the id is a guest's, or the host record
      // has been deleted. Said plainly, because "manage your own payout account"
      // sends someone to check an id that was never the problem.
      console.warn(
        `[auth] ${req.auth.kind} ${req.auth.id} hit a host-only route and has no Host record`
      );
      return res.status(403).json({
        error:
          "This account is not a host account, so it has no payout settings. " +
          "Sign in with your host account and try again.",
        code: "not_a_host",
      });
    },
  ];
}
