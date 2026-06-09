import { Router, type IRouter } from "express";
import { db, accessCodesTable, sessionsTable, auditLogsTable, siteSettingsTable } from "@workspace/db";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { LoginBody, GetMeResponse, LoginResponse, LogoutResponse } from "@workspace/api-zod";
import { SESSION_COOKIE, SESSION_DURATION_MS, requireAuth } from "../lib/session";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check if site is enabled
  const [siteSetting] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "site_enabled"));

  if (siteSetting && siteSetting.value === "false") {
    res.status(403).json({ error: "Site is currently disabled" });
    return;
  }

  const now = new Date();
  const [accessCode] = await db
    .select()
    .from(accessCodesTable)
    .where(
      and(
        eq(accessCodesTable.code, parsed.data.code),
        eq(accessCodesTable.isActive, true),
        or(isNull(accessCodesTable.expiresAt), gt(accessCodesTable.expiresAt, now))
      )
    );

  if (!accessCode) {
    const ip = req.ip ?? "unknown";
    const userAgent = req.get("user-agent") ?? "unknown";
    await db.insert(auditLogsTable).values({
      ip,
      userAgent,
      action: "login_failed",
      details: `Invalid code attempt`,
    });
    res.status(401).json({ error: "Invalid or expired access code" });
    return;
  }

  // Check max uses
  if (accessCode.maxUses !== null && accessCode.usedCount >= accessCode.maxUses) {
    res.status(401).json({ error: "Access code usage limit reached" });
    return;
  }

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const ip = req.ip ?? "unknown";
  const userAgent = req.get("user-agent") ?? "unknown";

  await db.insert(sessionsTable).values({
    sessionId,
    accessCodeId: accessCode.id,
    role: accessCode.role,
    ip,
    userAgent,
    expiresAt,
  });

  await db.update(accessCodesTable)
    .set({ usedCount: accessCode.usedCount + 1 })
    .where(eq(accessCodesTable.id, accessCode.id));

  await db.insert(auditLogsTable).values({
    sessionId,
    ip,
    userAgent,
    action: "login_success",
    details: `Logged in with code: ${accessCode.label ?? accessCode.code}`,
  });

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS,
  });

  res.json(LoginResponse.parse({
    success: true,
    role: accessCode.role,
    sessionId,
  }));
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const session = (req as any).session;

  await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, session.sessionId));

  await db.insert(auditLogsTable).values({
    sessionId: session.sessionId,
    ip: session.ip,
    userAgent: session.userAgent,
    action: "logout",
    details: null,
  });

  res.clearCookie(SESSION_COOKIE);
  res.json(LogoutResponse.parse({ success: true, message: "Logged out" }));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const session = (req as any).session;

  const [code] = await db
    .select({ label: accessCodesTable.label, code: accessCodesTable.code })
    .from(accessCodesTable)
    .where(eq(accessCodesTable.id, session.accessCodeId));

  res.json(GetMeResponse.parse({
    sessionId: session.sessionId,
    role: session.role,
    ip: session.ip,
    userAgent: session.userAgent,
    createdAt: session.createdAt.toISOString(),
    accessCodeLabel: code?.label ?? code?.code ?? null,
  }));
});

export default router;
