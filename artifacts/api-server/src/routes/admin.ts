import { Router, type IRouter } from "express";
import { db, accessCodesTable, sessionsTable, auditLogsTable, searchesTable, siteSettingsTable } from "@workspace/db";
import { eq, desc, count, and, gt } from "drizzle-orm";
import {
  GetAdminStatsResponse,
  ListAccessCodesResponse,
  CreateAccessCodeBody,
  UpdateAccessCodeBody,
  UpdateAccessCodeParams,
  DeleteAccessCodeParams,
  ListActiveSessionsResponse,
  TerminateSessionParams,
  GetAuditLogsQueryParams,
  GetAuditLogsResponse,
  UpdateSiteStatusBody,
  UpdateSiteStatusResponse,
  ListAccessCodesResponseItem,
  UpdateAccessCodeResponse,
  DeleteAccessCodeResponse,
  TerminateSessionResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/session";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const now = new Date();

  const [totalCodesRow] = await db.select({ count: count() }).from(accessCodesTable);
  const [activeCodesRow] = await db.select({ count: count() }).from(accessCodesTable).where(eq(accessCodesTable.isActive, true));
  const [activeSessionsRow] = await db.select({ count: count() }).from(sessionsTable).where(gt(sessionsTable.expiresAt, now));
  const [totalSearchesRow] = await db.select({ count: count() }).from(searchesTable);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [searchesTodayRow] = await db.select({ count: count() }).from(searchesTable).where(gt(searchesTable.createdAt, todayStart));

  const [siteSetting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "site_enabled"));
  const siteEnabled = !siteSetting || siteSetting.value !== "false";

  res.json(GetAdminStatsResponse.parse({
    totalCodes: totalCodesRow?.count ?? 0,
    activeCodes: activeCodesRow?.count ?? 0,
    activeSessions: activeSessionsRow?.count ?? 0,
    totalSearches: totalSearchesRow?.count ?? 0,
    searchesToday: searchesTodayRow?.count ?? 0,
    siteEnabled,
  }));
});

router.get("/admin/codes", requireAdmin, async (req, res): Promise<void> => {
  const codes = await db.select().from(accessCodesTable).orderBy(desc(accessCodesTable.createdAt));
  res.json(ListAccessCodesResponse.parse(codes.map((c) => ({
    ...c,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }))));
});

router.post("/admin/codes", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateAccessCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { code, label, role, maxUses, expiresAt } = parsed.data;
  const [newCode] = await db.insert(accessCodesTable).values({
    code,
    label: label ?? null,
    role: role ?? "user",
    maxUses: maxUses ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  res.status(201).json(ListAccessCodesResponseItem.parse({
    ...newCode,
    expiresAt: newCode.expiresAt?.toISOString() ?? null,
    createdAt: newCode.createdAt.toISOString(),
  }));
});

router.patch("/admin/codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAccessCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAccessCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { label, isActive, maxUses, expiresAt } = parsed.data;
  const updates: any = {};
  if (label !== undefined) updates.label = label;
  if (isActive !== undefined) updates.isActive = isActive;
  if (maxUses !== undefined) updates.maxUses = maxUses;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const [updated] = await db.update(accessCodesTable)
    .set(updates)
    .where(eq(accessCodesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Access code not found" });
    return;
  }

  res.json(UpdateAccessCodeResponse.parse({
    ...updated,
    expiresAt: updated.expiresAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  }));
});

router.delete("/admin/codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAccessCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(accessCodesTable)
    .where(eq(accessCodesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Access code not found" });
    return;
  }

  res.json(DeleteAccessCodeResponse.parse({ success: true, message: "Deleted" }));
});

router.get("/admin/sessions", requireAdmin, async (req, res): Promise<void> => {
  const now = new Date();
  const sessions = await db
    .select({
      sessionId: sessionsTable.sessionId,
      ip: sessionsTable.ip,
      userAgent: sessionsTable.userAgent,
      country: sessionsTable.country,
      role: sessionsTable.role,
      createdAt: sessionsTable.createdAt,
      lastSeenAt: sessionsTable.lastSeenAt,
      codeLabel: accessCodesTable.label,
      code: accessCodesTable.code,
    })
    .from(sessionsTable)
    .leftJoin(accessCodesTable, eq(sessionsTable.accessCodeId, accessCodesTable.id))
    .where(gt(sessionsTable.expiresAt, now))
    .orderBy(desc(sessionsTable.lastSeenAt));

  res.json(ListActiveSessionsResponse.parse(sessions.map((s) => ({
    sessionId: s.sessionId,
    ip: s.ip,
    userAgent: s.userAgent,
    country: s.country ?? null,
    accessCodeLabel: s.codeLabel ?? s.code ?? null,
    role: s.role,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
  }))));
});

router.delete("/admin/sessions/:sessionId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

  const [deleted] = await db.delete(sessionsTable)
    .where(eq(sessionsTable.sessionId, raw))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(TerminateSessionResponse.parse({ success: true, message: "Session terminated" }));
});

router.get("/admin/logs", requireAdmin, async (req, res): Promise<void> => {
  const query = GetAuditLogsQueryParams.safeParse(req.query);
  const page = query.success && query.data.page ? Number(query.data.page) : 1;
  const limit = query.success && query.data.limit ? Number(query.data.limit) : 50;
  const offset = (page - 1) * limit;

  const [totalRow] = await db.select({ count: count() }).from(auditLogsTable);
  const logs = await db.select().from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(GetAuditLogsResponse.parse({
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    total: totalRow?.count ?? 0,
    page,
    limit,
  }));
});

router.patch("/admin/site-status", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSiteStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const value = parsed.data.enabled ? "true" : "false";
  await db.insert(siteSettingsTable)
    .values({ key: "site_enabled", value })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });

  res.json(UpdateSiteStatusResponse.parse({ success: true, message: `Site ${parsed.data.enabled ? "enabled" : "disabled"}` }));
});

export default router;
