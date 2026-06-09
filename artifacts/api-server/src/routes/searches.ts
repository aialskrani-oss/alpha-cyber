import { Router, type IRouter } from "express";
import { db, searchesTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  StartSearchBody,
  ListSearchesQueryParams,
  ListSearchesResponse,
  GetSearchParams,
  GetSearchResponse,
  DeleteSearchParams,
  DeleteSearchResponse,
  ExportSearchParams,
  ExportSearchBody,
  ExportSearchResponse,
  GetSearchStatsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/session";
import { runOsintSearch, TOOLS_BY_TYPE, ALL_TOOLS } from "../lib/osint";
import { wsClients } from "../lib/wsClients";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/tools/search", requireAuth, async (req, res): Promise<void> => {
  const parsed = StartSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { target, targetType, tools } = parsed.data;
  const session = (req as any).session;
  const searchId = uuidv4();

  const selectedTools = tools && tools.length > 0
    ? tools.filter((t) => ALL_TOOLS.includes(t))
    : (TOOLS_BY_TYPE[targetType] ?? ALL_TOOLS);

  await db.insert(searchesTable).values({
    searchId,
    sessionId: session.sessionId,
    target,
    targetType,
    status: "queued",
    tools: selectedTools,
  });

  // Run async in background
  runOsintSearch(searchId, target, targetType, selectedTools, (toolName, status, found) => {
    const clients = wsClients.get(searchId);
    if (clients) {
      const msg = JSON.stringify({ tool: toolName, status, found });
      for (const ws of clients) {
        if ((ws as any).readyState === 1) {
          (ws as any).send(msg);
        }
      }
    }
  }).then(() => {
    const clients = wsClients.get(searchId);
    if (clients) {
      const msg = JSON.stringify({ type: "completed" });
      for (const ws of clients) {
        if ((ws as any).readyState === 1) {
          (ws as any).send(msg);
        }
      }
    }
  }).catch((err) => {
    logger.error({ err, searchId }, "Search failed");
  });

  const [search] = await db.select().from(searchesTable).where(eq(searchesTable.searchId, searchId));

  res.status(201).json({
    searchId,
    target: search.target,
    targetType: search.targetType,
    status: search.status,
    tools: selectedTools,
    createdAt: search.createdAt.toISOString(),
  });
});

router.get("/searches", requireAuth, async (req, res): Promise<void> => {
  const query = ListSearchesQueryParams.safeParse(req.query);
  const page = query.success && query.data.page ? Number(query.data.page) : 1;
  const limit = query.success && query.data.limit ? Number(query.data.limit) : 20;
  const offset = (page - 1) * limit;

  const [totalRow] = await db.select({ count: count() }).from(searchesTable);
  const searches = await db.select().from(searchesTable)
    .orderBy(desc(searchesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(ListSearchesResponse.parse({
    searches: searches.map((s) => ({
      searchId: s.searchId,
      target: s.target,
      targetType: s.targetType,
      status: s.status,
      totalFound: s.totalFound,
      toolCount: (s.tools as string[]).length,
      createdAt: s.createdAt.toISOString(),
    })),
    total: totalRow?.count ?? 0,
    page,
    limit,
  }));
});

router.get("/searches/stats", requireAuth, async (req, res): Promise<void> => {
  const all = await db.select().from(searchesTable);

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const toolCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};

  for (const s of all) {
    byType[s.targetType] = (byType[s.targetType] ?? 0) + 1;
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

    for (const tool of (s.tools as string[])) {
      toolCounts[tool] = (toolCounts[tool] ?? 0) + 1;
    }

    const date = s.createdAt.toISOString().split("T")[0];
    dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
  }

  const recentDates = [...new Set(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    })
  )].sort();

  res.json(GetSearchStatsResponse.parse({
    byTargetType: Object.entries(byType).map(([label, count]) => ({ label, count })),
    byStatus: Object.entries(byStatus).map(([label, count]) => ({ label, count })),
    topTools: Object.entries(toolCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([label, count]) => ({ label, count })),
    recentActivity: recentDates.map((date) => ({ date, count: dailyCounts[date] ?? 0 })),
  }));
});

router.get("/searches/:searchId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.searchId) ? req.params.searchId[0] : req.params.searchId;

  const [search] = await db.select().from(searchesTable).where(eq(searchesTable.searchId, raw));

  if (!search) {
    res.status(404).json({ error: "Search not found" });
    return;
  }

  res.json(GetSearchResponse.parse({
    searchId: search.searchId,
    target: search.target,
    targetType: search.targetType,
    status: search.status,
    tools: search.tools as string[],
    toolResults: search.toolResults as any[],
    totalFound: search.totalFound,
    createdAt: search.createdAt.toISOString(),
    completedAt: search.completedAt?.toISOString() ?? null,
  }));
});

router.delete("/searches/:searchId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.searchId) ? req.params.searchId[0] : req.params.searchId;

  const [deleted] = await db.delete(searchesTable)
    .where(eq(searchesTable.searchId, raw))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Search not found" });
    return;
  }

  res.json(DeleteSearchResponse.parse({ success: true, message: "Search deleted" }));
});

router.post("/searches/:searchId/export", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.searchId) ? req.params.searchId[0] : req.params.searchId;
  const parsed = ExportSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [search] = await db.select().from(searchesTable).where(eq(searchesTable.searchId, raw));
  if (!search) {
    res.status(404).json({ error: "Search not found" });
    return;
  }

  const format = parsed.data.format;
  let data = "";
  let filename = `alpha_cyber_search_${raw.slice(0, 8)}`;

  if (format === "json") {
    data = Buffer.from(JSON.stringify(search, null, 2)).toString("base64");
    filename += ".json";
  } else if (format === "csv") {
    const rows = [["Platform", "Username", "URL", "Found", "Location"]];
    for (const tr of (search.toolResults as any[])) {
      for (const r of (tr.results ?? [])) {
        rows.push([r.platform ?? "", r.username ?? "", r.url ?? "", String(r.found), r.location ?? ""]);
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    data = Buffer.from(csv).toString("base64");
    filename += ".csv";
  } else {
    data = Buffer.from(JSON.stringify(search, null, 2)).toString("base64");
    filename += ".pdf.json";
  }

  res.json(ExportSearchResponse.parse({ format, data, filename }));
});

export default router;
