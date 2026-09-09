// lib/auth/src/index.ts
//
// Password and session-token primitives, in ONE place.
//
// They were already implemented — well — in
// artifacts/api-server/src/routes/test-auth.ts: scrypt with a per-password
// salt, SHA-256 session-token hashing, timingSafeEqual for the comparison.
// This package is that scheme extracted rather than rewritten, byte-for-byte
// compatible, so accounts created by either side work on both.
//
// Extracted because the alternative was a second copy in the Next.js app,
// and a second copy of password verification is how a security fix lands in
// one file and not the other. Two implementations of "is this password
// correct" is one implementation too many.

import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

/** Encoded as `saltHex:keyHex`. 16-byte salt, 64-byte derived key. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

/**
 * Constant-time comparison — `timingSafeEqual`, never `===`.
 *
 * A plain string compare returns as soon as two bytes differ, so how long
 * the answer takes leaks how much of the hash an attacker has guessed. It
 * is a small leak and a completely avoidable one.
 */
export async function passwordMatches(
  password: string,
  encodedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = encodedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    64
  )) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Sessions are stored HASHED, never in plaintext.
 *
 * The row holds sha256(token); the token itself only ever exists in the
 * cookie. So a leaked database dump — a backup, a read-only replica, a SQL
 * injection — does not hand anyone a working session, the way a table of
 * plaintext tokens would.
 *
 * SHA-256 rather than scrypt is right here and wrong for passwords: a
 * session token is 32 bytes of CSPRNG output, so there is no dictionary to
 * attack and nothing for a slow hash to buy. Passwords are low-entropy and
 * human-chosen, which is why they get scrypt above.
 */
export const hashSessionToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const SESSION_TOKEN_PREFIX = "putko_session_";

/** 32 bytes from the CSPRNG. Never Math.random, never a timestamp, never a uuid. */
export const newSessionToken = (): string =>
  `${SESSION_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

/** How long a session lives. Renewed on use; see resolveSession(). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
