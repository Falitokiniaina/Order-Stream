import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  mdp_admin: text("mdp_admin").notNull().default("admin123"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SystemSettings = typeof systemSettingsTable.$inferSelect;
