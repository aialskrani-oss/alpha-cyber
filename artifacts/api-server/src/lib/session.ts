import { db, sessionsTable, accessCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const SESSION_COOKIE = "alpha_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function getSession(sessionId: string) {
  const now = new Date();
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.sessionId, sessionId),
        gt(sessionsTable.expiresAt, now)
      )
    );
  return session ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const session = await getSession(sessionId);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }
  // Refresh lastSeenAt
  await db.update(sessionsTable)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessionsTable.sessionId, sessionId));

  (req as any).session = session;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const session = (req as any).session;
    if (session.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
