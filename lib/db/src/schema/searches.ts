import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const searchesTable = pgTable("searches", {
  searchId: text("search_id").primaryKey(),
  sessionId: text("session_id"),
  target: text("target").notNull(),
  targetType: text("target_type").notNull(),
  status: text("status").notNull().default("queued"),
  tools: jsonb("tools").notNull().default([]),
  toolResults: jsonb("tool_results").notNull().default([]),
  totalFound: integer("total_found").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertSearchSchema = createInsertSchema(searchesTable).omit({ createdAt: true, completedAt: true, totalFound: true, toolResults: true });
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type Search = typeof searchesTable.$inferSelect;
