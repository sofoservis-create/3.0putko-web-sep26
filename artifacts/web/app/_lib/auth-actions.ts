"use server";

// app/_lib/auth-actions.ts
//
// Login, logout and mode switching, as Server Actions.
//
// Server Actions rather than API routes on purpose: the browser never sees
// an endpoint that takes a user id, so there is no id for anyone to
// substitute. Every action below derives who it is acting on from the
// session cookie, never from its own arguments — which is the shape of
// audit finding C-01, where `POST /api/auth/change-password` takes the
// target account's id in the request body and changes anyone's password.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  testGuestsTable,
  testGuestSessionsTable,
} from "@workspace/db/schema";
import {
  passwordMatches,
  hashSessionToken,
  newSessionToken,
  SESSION_TTL_MS,
} from "@workspace/auth";
import { SESSION_COOKIE, getSession } from "./session";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Zadajte e-mail aj heslo." };
  }

  const [guest] = await db
    .select()
    .from(testGuestsTable)
    .where(eq(testGuestsTable.email, email))
    .limit(1);

  // One message for "no such account" and for "wrong password", and the
  // password is verified even when the account does not exist — see below.
  // Distinguishing them turns the login form into an account-existence
  // oracle: anyone can test an email list against it and learn who is a
  // customer, which is both a privacy leak and a head start for credential
  // stuffing.
  const genericFailure = { error: "Nesprávny e-mail alebo heslo." };

  if (!guest) {
    // Burn a comparable amount of time against a dummy hash. Without this,
    // "no such user" returns immediately while a real user costs a full
    // scrypt derivation, and the timing difference alone answers the
    // question the shared error message refuses to.
    await passwordMatches(
      password,
      "00000000000000000000000000000000:" + "0".repeat(128)
    );
    return genericFailure;
  }

  if (!(await passwordMatches(password, guest.passwordHash))) {
    return genericFailure;
  }

  const token = newSessionToken();
  await db.insert(testGuestSessionsTable).values({
    guestId: guest.id,
    tokenHash: hashSessionToken(token),
    activeMode: guest.hostActivatedAt ? "host" : "guest",
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  // Where to land. With no explicit `next`, a host goes to the host area
  // and a guest to their account — landing an activated host on /ucet and
  // making them find a "switch" button is a small thing that reads as the
  // product not knowing who they are.
  const home = guest.hostActivatedAt ? "/host" : "/ucet";

  // Only same-origin paths. An open redirect here would let a phishing link
  // land on the REAL login form and then bounce the freshly authenticated
  // user to an attacker's page — `//evil.example` and `https://evil.example`
  // both look like "a next parameter" and are neither same-origin nor safe.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : home;
  // Cast because `next` is runtime user input — typedRoutes cannot check a
  // value that does not exist at build time. The safety here comes from the
  // same-origin check above, not from the type.
  redirect(safeNext as Route);
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  // Delete the SERVER-side session, not just the cookie. Clearing the
  // cookie alone leaves a token that still authenticates anywhere it was
  // copied — "log out" has to mean the token stops working, not that this
  // one browser forgot it.
  if (token) {
    await db
      .delete(testGuestSessionsTable)
      .where(eq(testGuestSessionsTable.tokenHash, hashSessionToken(token)));
  }
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

/**
 * Switch between the guest and host view of the same account.
 *
 * Putko accounts are dual — one person can rent a chata out and book one —
 * so this is a view preference, not a privilege change. It is still checked
 * against `hostActivatedAt` rather than trusted: writing "host" into a
 * session must not be able to create a host.
 */
export async function switchMode(mode: "guest" | "host"): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/prihlasenie");

  if (mode === "host" && !session.isHost) {
    redirect("/ucet?nie-ste-ubytovatel=1" as Route);
  }

  await db
    .update(testGuestSessionsTable)
    .set({ activeMode: mode })
    .where(eq(testGuestSessionsTable.id, session.sessionId));

  redirect((mode === "host" ? "/host" : "/ucet") as Route);
}
