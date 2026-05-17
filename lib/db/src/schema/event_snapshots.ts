import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { evenementsTable } from "./evenements";

export const eventSnapshotsTable = pgTable("event_snapshots", {
  id: serial("id").primaryKey(),
  event_id: integer("event_id").notNull().references(() => evenementsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventSnapshot = typeof eventSnapshotsTable.$inferSelect;
