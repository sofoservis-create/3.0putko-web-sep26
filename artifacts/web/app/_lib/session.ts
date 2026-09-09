import "server-only";

// app/_lib/session.ts
//
// Who is making this request. The only answer in the app.
//
// WHAT CHANGED FROM THE OLD SYSTEM
//
// The old frontend reads identity from the browser:
//
//     const user = JSON.parse(localStorage.getItem("user"));
//     const accommodationProviderId = user?._id;
//
// (.migration-backup/frontend/src/app/Profile/page.js:93–94, and four more
// components do the same.) That id is then sent to the API as the thing
// being asked about. Anyone can edit localStorage, so identity is whatever
// the client says it is — which is why the audit's C-01 lets any account's
// password be changed by putting someone else's id in a request body.
//
// Here identity is resolved on the server from an httpOnly cookie the page
// never sees, joined to a session row, and every account query takes the
// resolved id as a parameter. A component cannot ask about someone else
// because it never handles an id it could substitute.
//
// The cookie is httpOnly (JavaScript cannot read it, so XSS cannot exfiltrate
// it — unlike a token in localStorage, which is one injected script away),
// SameSite=Lax (not sent on cross-site POSTs, which closes CSRF for the
// mutations here), and Secure outside development.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  testGuestsTable,
  testGuestSessionsTable,
} from "@workspace/db/schema";
import { hashSessionToken, SESSION_TTL_MS } from "@workspace/auth";

export const SESSION_COOKIE = "putko_session";

export type Session = {
  guestId: string;
  email: string;
  name: string;
  lastName: string;
  phoneNumber: string;
  /** True when this account has completed host activation. */
  isHost: boolean;
  /** Which side of the product the user is currently looking at. */
  activeMode: "guest" | "host";
  sessionId: string;
};

/**
 * Resolve the current session, or null.
 *
 * Returns null rather than throwing: "not logged in" is a normal state for
 * most pages, and a layout that throws on an anonymous visitor is a layout
 * that cannot render a public page.
 */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      guest: testGuestsTable,
      session: testGuestSessionsTable,
    })
    .from(testGuestSessionsTable)
    .innerJoin(
      testGuestsTable,
      eq(testGuestSessionsTable.guestId, testGuestsTable.id)
    )
    .where(eq(testGuestSessionsTable.tokenHash, hashSessionToken(token)))
    .limit(1);

  if (!row) return null;

  // Expiry is checked HERE, on every request, not only at login. A session
  // row that has passed its expiry is deleted rather than merely ignored,
  // so an expired token cannot be resurrected by moving the clock and so
  // the table does not accumulate dead rows forever.
  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db
      .delete(testGuestSessionsTable)
      .where(eq(testGuestSessionsTable.id, row.session.id));
    return null;
  }

  return {
    guestId: row.guest.id,
    email: row.guest.email,
    name: row.guest.name,
    lastName: row.guest.lastName,
    phoneNumber: row.guest.phoneNumber,
    isHost: row.guest.hostActivatedAt !== null,
    // A session claiming host mode on an account that never activated as a
    // host is downgraded rather than trusted. activeMode is a preference;
    // hostActivatedAt is the fact.
    activeMode:
      row.session.activeMode === "host" && row.guest.hostActivatedAt !== null
        ? "host"
        : "guest",
    sessionId: row.session.id,
  };
}

/**
 * Session or redirect to login. For pages that have no anonymous rendering.
 *
 * `next` carries where the user was going so login can return them there,
 * which is the difference between a login wall and a dead end.
 */
export async function requireSession(next: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/prihlasenie?next=${encodeURIComponent(next)}` as Route);
  return session;
}

/**
 * Session that is also an activated host, or redirect.
 *
 * Checked on the SERVER, in the layout, so it applies to every page under
 * /host without each one remembering to ask. The old system's equivalent is
 * `<ProtectedRoute allowedRoles={["host"]}>` in the client component tree
 * (Profile/page.js:160) — which hides the UI while the underlying API
 * endpoints stay open to anyone (audit H-01: `restrict()` admits any account
 * it cannot find). Hiding a button is not authorization.
 */
export async function requireHost(next: string): Promise<Session> {
  const session = await requireSession(next);
  if (!session.isHost) redirect("/ucet?nie-ste-ubytovatel=1" as Route);
  return session;
}

/** Extend a live session's expiry. Called on login; safe to call again. */
export async function touchSession(sessionId: string): Promise<void> {
  await db
    .update(testGuestSessionsTable)
    .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .where(eq(testGuestSessionsTable.id, sessionId));
}

/** Drop sessions whose expiry has passed. Cheap, and keeps the table honest. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.execute(
    sql`DELETE FROM putko_test_guest_sessions WHERE expires_at <= now()`
  );
}
