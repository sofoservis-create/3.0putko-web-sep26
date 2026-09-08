import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  AddTestGuestFavoriteBody,
  ActivateTestGuestHostModeResponse,
  ChangeTestGuestPasswordBody,
  GetTestGuestFavoritesResponse,
  GetTestGuestProfileResponse,
  LoginTestGuestBody,
  LoginTestGuestResponse,
  RemoveTestGuestFavoriteParams,
  SwitchTestGuestModeBody,
  SwitchTestGuestModeResponse,
  RegisterTestGuestBody,
  RegisterTestGuestResponse,
  UpdateTestGuestProfileBody,
  VerifyTestGuestEmailParams,
  VerifyTestGuestEmailResponse,
} from "@workspace/api-zod";
import {
  db,
  testGuestFavoritesTable,
  testGuestSessionsTable,
  testGuestsTable,
  testHostAccommodationsTable,
} from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  accommodationCompletion,
  mergeAccommodationData,
  parseAccommodationData,
} from "../lib/test-host-accommodation";

const router: IRouter = Router();
const scrypt = promisify(nodeScrypt);
const VERIFICATION_LIFETIME_MS = 60 * 60 * 1000;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const messages = {
  en: {
    exists: "A test guest with this email already exists",
    invalid: "Invalid credentials",
    notFound: "Test guest not found",
    registered: "Test guest created",
    verified: "Email verified successfully",
    verifyFirst: "Please verify your email first",
    verificationInvalid: "Invalid or expired verification link",
    loginSuccess: "Successfully logged in",
    unauthorized: "Your session has expired. Please log in again.",
    profileUpdated: "Profile updated",
    passwordChanged: "Password changed. Please log in again.",
    currentPasswordInvalid: "Current password is incorrect",
    hostActivated: "Host mode activated",
    hostRequired: "Activate host mode first",
  },
  sk: {
    exists: "Testovací cestovateľ s týmto e-mailom už existuje",
    invalid: "Neplatné poverenia",
    notFound: "Testovací cestovateľ nebol nájdený",
    registered: "Testovací účet bol vytvorený",
    verified: "E-mail bol úspešne overený",
    verifyFirst: "Najprv si overte svoj e-mail",
    verificationInvalid: "Neplatný alebo expirovaný overovací odkaz",
    loginSuccess: "Úspešné prihlásenie",
    unauthorized: "Platnosť relácie vypršala. Prihláste sa znova.",
    profileUpdated: "Profil bol aktualizovaný",
    passwordChanged: "Heslo bolo zmenené. Prihláste sa znova.",
    currentPasswordInvalid: "Aktuálne heslo nie je správne",
    hostActivated: "Režim hostiteľa bol aktivovaný",
    hostRequired: "Najprv aktivujte režim hostiteľa",
  },
} as const;

const getMessages = (lang: unknown) => messages[lang === "en" ? "en" : "sk"];

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
};

const passwordMatches = async (password: string, encodedHash: string) => {
  const [saltHex, hashHex] = encodedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const toPublicGuest = (
  guest: typeof testGuestsTable.$inferSelect,
  activeMode: "guest" | "host" = "guest",
) =>
  GetTestGuestProfileResponse.parse({
    id: guest.id,
    name: guest.name,
    lastName: guest.lastName,
    email: guest.email,
    phoneNumber: guest.phoneNumber,
    gender: guest.gender,
    language: guest.language,
    isVerified: guest.isVerified,
    capabilities: guest.hostActivatedAt ? ["guest", "host"] : ["guest"],
    activeMode:
      activeMode === "host" && guest.hostActivatedAt ? "host" : "guest",
    hostActivatedAt: guest.hostActivatedAt?.toISOString() ?? null,
  });

const getAuthenticatedGuest = async (req: Request) => {
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

const favoriteIds = async (guestId: string) => {
  const rows = await db
    .select({ accommodationId: testGuestFavoritesTable.accommodationId })
    .from(testGuestFavoritesTable)
    .where(eq(testGuestFavoritesTable.guestId, guestId));
  return rows.map((row) => row.accommodationId);
};

const getHostGuest = async (req: Request) => {
  const auth = await getAuthenticatedGuest(req);
  if (!auth) return { error: "unauthorized" as const };
  if (!auth.guest.hostActivatedAt) return { error: "hostRequired" as const };
  return { auth };
};

const accommodationId = (req: Request) => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return typeof raw === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw,
    )
    ? raw
    : null;
};

const publicAccommodation = (
  accommodation: typeof testHostAccommodationsTable.$inferSelect,
) => ({
  id: accommodation.id,
  data: accommodation.data,
  status: accommodation.status,
  createdAt: accommodation.createdAt,
  updatedAt: accommodation.updatedAt,
  ...accommodationCompletion(accommodation.data),
});

const requireHostGuest = async (req: Request, res: Response) => {
  const result = await getHostGuest(req);
  if ("auth" in result) return result.auth;
  res
    .status(result.error === "unauthorized" ? 401 : 403)
    .json({
      message:
        result.error === "unauthorized"
          ? messages.sk.unauthorized
          : messages.sk.hostRequired,
    });
  return null;
};

router.use((_req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
});

router.post("/test-auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterTestGuestBody.safeParse(req.body);
  const t = getMessages(req.body?.lang);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: testGuestsTable.id })
    .from(testGuestsTable)
    .where(eq(testGuestsTable.email, email))
    .limit(1);

  if (existing) {
    res.status(400).json({ message: t.exists });
    return;
  }

  const verificationToken = `test_${randomBytes(32).toString("base64url")}`;
  await db.insert(testGuestsTable).values({
    email,
    passwordHash: await hashPassword(parsed.data.password),
    name: parsed.data.name.trim(),
    lastName: parsed.data.lastName.trim(),
    phoneNumber: parsed.data.phoneNumber,
    gender: parsed.data.gender,
    language: parsed.data.language ?? "Slovak",
    role: "guest",
    isVerified: false,
    verificationTokenHash: hashToken(verificationToken),
    verificationTokenExpiresAt: new Date(
      Date.now() + VERIFICATION_LIFETIME_MS,
    ),
  });

  res.status(201).json(
    RegisterTestGuestResponse.parse({
      message: t.registered,
      verificationToken,
    }),
  );
});

router.post("/test-auth/login", async (req, res): Promise<void> => {
  const parsed = LoginTestGuestBody.safeParse(req.body);
  const t = getMessages(req.body?.lang);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [guest] = await db
    .select()
    .from(testGuestsTable)
    .where(eq(testGuestsTable.email, parsed.data.email.trim().toLowerCase()))
    .limit(1);

  if (!guest) {
    res.status(404).json({ message: t.notFound });
    return;
  }
  if (!guest.isVerified) {
    res.status(400).json({ message: t.verifyFirst });
    return;
  }
  if (!(await passwordMatches(parsed.data.password, guest.passwordHash))) {
    res.status(400).json({ message: t.invalid });
    return;
  }

  const sessionToken = `test_session_${randomBytes(32).toString("base64url")}`;
  await db.insert(testGuestSessionsTable).values({
    guestId: guest.id,
    tokenHash: hashToken(sessionToken),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  });

  res.json(
    LoginTestGuestResponse.parse({
      status: true,
      message: t.loginSuccess,
      token: sessionToken,
      data: toPublicGuest(guest),
      role: "guest",
    }),
  );
});

router.get("/test-auth/verify-email/:token", async (req, res): Promise<void> => {
  const parsed = VerifyTestGuestEmailParams.safeParse(req.params);
  if (!parsed.success || !parsed.data.token.startsWith("test_")) {
    res.status(400).json({ message: messages.sk.verificationInvalid });
    return;
  }

  const [guest] = await db
    .select()
    .from(testGuestsTable)
    .where(
      eq(
        testGuestsTable.verificationTokenHash,
        hashToken(parsed.data.token),
      ),
    )
    .limit(1);

  if (
    !guest ||
    !guest.verificationTokenExpiresAt ||
    guest.verificationTokenExpiresAt.getTime() <= Date.now()
  ) {
    res.status(400).json({ message: messages.sk.verificationInvalid });
    return;
  }

  await db
    .update(testGuestsTable)
    .set({
      isVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    })
    .where(eq(testGuestsTable.id, guest.id));

  res.json(
    VerifyTestGuestEmailResponse.parse({ message: messages.sk.verified }),
  );
});

router.get("/test-auth/me", async (req, res): Promise<void> => {
  const auth = await getAuthenticatedGuest(req);
  if (!auth) {
    res.status(401).json({ message: messages.sk.unauthorized });
    return;
  }
  res.json(
    toPublicGuest(
      auth.guest,
      auth.session.activeMode === "host" ? "host" : "guest",
    ),
  );
});

router.patch("/test-auth/me", async (req, res): Promise<void> => {
  const auth = await getAuthenticatedGuest(req);
  const parsed = UpdateTestGuestProfileBody.safeParse(req.body);
  if (!auth) {
    res.status(401).json({ message: messages.sk.unauthorized });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid profile" });
    return;
  }
  const [updated] = await db
    .update(testGuestsTable)
    .set({
      name: parsed.data.name.trim(),
      lastName: parsed.data.lastName.trim(),
      phoneNumber: parsed.data.phoneNumber.replace(/\s/g, ""),
      gender: parsed.data.gender,
      language: parsed.data.language,
    })
    .where(eq(testGuestsTable.id, auth.guest.id))
    .returning();
  res.json(
    toPublicGuest(
      updated,
      auth.session.activeMode === "host" ? "host" : "guest",
    ),
  );
});

router.post("/test-auth/host-activation", async (req, res): Promise<void> => {
  const auth = await getAuthenticatedGuest(req);
  if (!auth) {
    res.status(401).json({ message: messages.sk.unauthorized });
    return;
  }

  const activated = await db.transaction(async (tx) => {
    await tx
      .update(testGuestsTable)
      .set({ hostActivatedAt: new Date() })
      .where(
        and(
          eq(testGuestsTable.id, auth.guest.id),
          isNull(testGuestsTable.hostActivatedAt),
        ),
      );
    await tx
      .update(testGuestSessionsTable)
      .set({ activeMode: "host" })
      .where(eq(testGuestSessionsTable.id, auth.session.id));
    const [guest] = await tx
      .select()
      .from(testGuestsTable)
      .where(eq(testGuestsTable.id, auth.guest.id))
      .limit(1);
    return guest;
  });

  res.json(
    ActivateTestGuestHostModeResponse.parse(toPublicGuest(activated, "host")),
  );
});

router.patch("/test-auth/mode", async (req, res): Promise<void> => {
  const auth = await getAuthenticatedGuest(req);
  const parsed = SwitchTestGuestModeBody.safeParse(req.body);
  const t = getMessages(req.body?.lang);
  if (!auth) {
    res.status(401).json({ message: t.unauthorized });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid mode" });
    return;
  }
  if (parsed.data.mode === "host" && !auth.guest.hostActivatedAt) {
    res.status(400).json({ message: t.hostRequired });
    return;
  }

  await db
    .update(testGuestSessionsTable)
    .set({ activeMode: parsed.data.mode })
    .where(eq(testGuestSessionsTable.id, auth.session.id));

  res.json(
    SwitchTestGuestModeResponse.parse(
      toPublicGuest(auth.guest, parsed.data.mode),
    ),
  );
});

router.post("/test-auth/change-password", async (req, res): Promise<void> => {
  const auth = await getAuthenticatedGuest(req);
  const parsed = ChangeTestGuestPasswordBody.safeParse(req.body);
  const t = getMessages(req.body?.lang);
  if (!auth) {
    res.status(401).json({ message: t.unauthorized });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid password" });
    return;
  }
  if (!(await passwordMatches(parsed.data.currentPassword, auth.guest.passwordHash))) {
    res.status(400).json({ message: t.currentPasswordInvalid });
    return;
  }
  await db
    .update(testGuestsTable)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(testGuestsTable.id, auth.guest.id));
  await db
    .delete(testGuestSessionsTable)
    .where(eq(testGuestSessionsTable.guestId, auth.guest.id));
  res.json({ message: t.passwordChanged });
});

router.post("/test-auth/logout", async (req, res): Promise<void> => {
  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (token.startsWith("test_session_")) {
    await db
      .delete(testGuestSessionsTable)
      .where(eq(testGuestSessionsTable.tokenHash, hashToken(token)));
  }
  res.json({ message: "Logged out" });
});

router.get("/test-auth/favorites", async (req, res): Promise<void> => {
  const auth = await getAuthenticatedGuest(req);
  if (!auth) {
    res.status(401).json({ message: messages.sk.unauthorized });
    return;
  }
  res.json(
    GetTestGuestFavoritesResponse.parse({
      favorites: await favoriteIds(auth.guest.id),
    }),
  );
});

router.post("/test-auth/favorites", async (req, res): Promise<void> => {
  const auth = await getAuthenticatedGuest(req);
  const parsed = AddTestGuestFavoriteBody.safeParse(req.body);
  if (!auth) {
    res.status(401).json({ message: messages.sk.unauthorized });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid accommodation" });
    return;
  }
  await db
    .insert(testGuestFavoritesTable)
    .values({
      guestId: auth.guest.id,
      accommodationId: parsed.data.accommodationId,
    })
    .onConflictDoNothing();
  res.json({ favorites: await favoriteIds(auth.guest.id) });
});

router.delete(
  "/test-auth/favorites/:accommodationId",
  async (req, res): Promise<void> => {
    const auth = await getAuthenticatedGuest(req);
    const parsed = RemoveTestGuestFavoriteParams.safeParse(req.params);
    if (!auth) {
      res.status(401).json({ message: messages.sk.unauthorized });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid accommodation" });
      return;
    }
    await db
      .delete(testGuestFavoritesTable)
      .where(
        and(
          eq(testGuestFavoritesTable.guestId, auth.guest.id),
          eq(
            testGuestFavoritesTable.accommodationId,
            parsed.data.accommodationId,
          ),
        ),
      );
    res.json({ favorites: await favoriteIds(auth.guest.id) });
  },
);

router.get(
  "/test-auth/host-accommodations",
  async (req, res): Promise<void> => {
    const auth = await requireHostGuest(req, res);
    if (!auth) return;
    const accommodations = await db
      .select()
      .from(testHostAccommodationsTable)
      .where(eq(testHostAccommodationsTable.ownerId, auth.guest.id))
      .orderBy(desc(testHostAccommodationsTable.updatedAt));
    res.json({ accommodations: accommodations.map(publicAccommodation) });
  },
);

router.post(
  "/test-auth/host-accommodations",
  async (req, res): Promise<void> => {
    const auth = await requireHostGuest(req, res);
    if (!auth) return;
    const parsed = parseAccommodationData(req.body ?? {});
    if ("error" in parsed) {
      res.status(400).json({ message: parsed.error });
      return;
    }
    const completion = accommodationCompletion(parsed.data);
    const [accommodation] = await db
      .insert(testHostAccommodationsTable)
      .values({
        ownerId: auth.guest.id,
        data: parsed.data,
        status: completion.canPublish ? "READY" : "DRAFT",
      })
      .returning();
    res.status(201).json(publicAccommodation(accommodation));
  },
);

router.get(
  "/test-auth/host-accommodations/:id",
  async (req, res): Promise<void> => {
    const auth = await requireHostGuest(req, res);
    if (!auth) return;
    const id = accommodationId(req);
    if (!id) {
      res.status(400).json({ message: "Invalid accommodation id" });
      return;
    }
    const [accommodation] = await db
      .select()
      .from(testHostAccommodationsTable)
      .where(
        and(
          eq(testHostAccommodationsTable.id, id),
          eq(testHostAccommodationsTable.ownerId, auth.guest.id),
        ),
      )
      .limit(1);
    if (!accommodation) {
      res.status(404).json({ message: "Accommodation not found" });
      return;
    }
    res.json(publicAccommodation(accommodation));
  },
);

router.patch(
  "/test-auth/host-accommodations/:id",
  async (req, res): Promise<void> => {
    const auth = await requireHostGuest(req, res);
    if (!auth) return;
    const id = accommodationId(req);
    const parsed = parseAccommodationData(req.body);
    if (!id) {
      res.status(400).json({ message: "Invalid accommodation id" });
      return;
    }
    if ("error" in parsed) {
      res.status(400).json({ message: parsed.error });
      return;
    }
    const [existing] = await db
      .select()
      .from(testHostAccommodationsTable)
      .where(
        and(
          eq(testHostAccommodationsTable.id, id),
          eq(testHostAccommodationsTable.ownerId, auth.guest.id),
        ),
      )
      .limit(1);
    if (!existing) {
      res.status(404).json({ message: "Accommodation not found" });
      return;
    }
    const data = mergeAccommodationData(existing.data, parsed.data);
    const completion = accommodationCompletion(data);
    const [accommodation] = await db
      .update(testHostAccommodationsTable)
      .set({
        data,
        status:
          existing.status === "LIVE" && completion.canPublish
            ? "LIVE"
            : completion.canPublish
              ? "READY"
              : "DRAFT",
      })
      .where(eq(testHostAccommodationsTable.id, id))
      .returning();
    res.json(publicAccommodation(accommodation));
  },
);

router.delete(
  "/test-auth/host-accommodations/:id",
  async (req, res): Promise<void> => {
    const auth = await requireHostGuest(req, res);
    if (!auth) return;
    const id = accommodationId(req);
    if (!id) {
      res.status(400).json({ message: "Invalid accommodation id" });
      return;
    }
    const [accommodation] = await db
      .delete(testHostAccommodationsTable)
      .where(
        and(
          eq(testHostAccommodationsTable.id, id),
          eq(testHostAccommodationsTable.ownerId, auth.guest.id),
        ),
      )
      .returning();
    if (!accommodation) {
      res.status(404).json({ message: "Accommodation not found" });
      return;
    }
    res.sendStatus(204);
  },
);

router.post(
  "/test-auth/host-accommodations/:id/publish",
  async (req, res): Promise<void> => {
    const auth = await requireHostGuest(req, res);
    if (!auth) return;
    const id = accommodationId(req);
    if (!id) {
      res.status(400).json({ message: "Invalid accommodation id" });
      return;
    }
    const [existing] = await db
      .select()
      .from(testHostAccommodationsTable)
      .where(
        and(
          eq(testHostAccommodationsTable.id, id),
          eq(testHostAccommodationsTable.ownerId, auth.guest.id),
        ),
      )
      .limit(1);
    if (!existing) {
      res.status(404).json({ message: "Accommodation not found" });
      return;
    }
    if (!accommodationCompletion(existing.data).canPublish) {
      res.status(400).json({
        message: "Accommodation must be 100% complete before publishing",
        ...accommodationCompletion(existing.data),
      });
      return;
    }
    const [accommodation] = await db
      .update(testHostAccommodationsTable)
      .set({ status: "LIVE" })
      .where(eq(testHostAccommodationsTable.id, id))
      .returning();
    res.json({
      ...publicAccommodation(accommodation),
      simulated: true,
      message: "Development accommodation is now simulated LIVE",
    });
  },
);

export default router;