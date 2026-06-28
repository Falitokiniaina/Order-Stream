import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const DEFAULT_FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#C53030"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><path d="M20 3 L8 17 H15 L12 29 L24 15 H17 Z" fill="white"/></svg>';

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  mdp_admin: text("mdp_admin").notNull().default("admin123"),
  favicon_svg: text("favicon_svg").notNull().default(DEFAULT_FAVICON_SVG),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SystemSettings = typeof systemSettingsTable.$inferSelect;
