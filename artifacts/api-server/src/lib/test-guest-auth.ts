import { createHash } from "node:crypto";
import {
  db,
  testGuestSessionsTable,
  testGuestsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

/**
 * Bearer-session helpers shared by every development-only host/guest route.
 * The session token is only ever compared by hash; ownership of any host
 * resource is decided here on the server, never from a client-supplied id.
 */

export const authMessages = {
  unauthorized: "Platnosť relácie vypršala. Prihláste sa znova.",
  hostRequired: "Najprv aktivujte režim hostiteľa",
} as const;

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export type AuthenticatedGuest = {
  guest: typeof testGuestsTable.$inferSelect;
  session: typeof testGuestSessionsTable.$inferSelect;
};

export const getAuthenticatedGuest = async (
  req: Request,
): Promise<AuthenticatedGuest | null> => {
  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!token.startsWith("test_session_")) return null;

  const [result] = await db
    .select({ guest: testGuestsTable, session: testGuestSessionsTable })
    .from(testGuestSessionsTable)
    .innerJoin(
      testGuestsTable,
      eq(testGuestSessionsTable.guestId, testGuestsTable.id),
    )
    .where(eq(testGuestSessionsTable.tokenHash, hashToken(token)))
    .limit(1);

  if (!result || result.session.expiresAt.getTime() <= Date.now()) {
    if (result) {
      await db
        .delete(testGuestSessionsTable)
        .where(eq(testGuestSessionsTable.id, result.session.id));
    }
    return null;
  }
  return result;
};

/**
 * Resolves the calling host or writes the 401/403 response and returns null.
 */
export const requireHostGuest = async (
  req: Request,
  res: Response,
): Promise<AuthenticatedGuest | null> => {
  const auth = await getAuthenticatedGuest(req);
  if (!auth) {
    res.status(401).json({ message: authMessages.unauthorized });
    return null;
  }
  if (!auth.guest.hostActivatedAt) {
    res.status(403).json({ message: authMessages.hostRequired });
    return null;
  }
  return auth;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The `:id` route param when it is a well-formed UUID, otherwise null. */
export const accommodationIdParam = (req: Request, name = "id") => {
  const value = req.params[name];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && UUID_PATTERN.test(raw) ? raw : null;
};
