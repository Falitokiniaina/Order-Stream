import { pgTable, serial, integer, text, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { commandesTable } from "./commandes";

export const deviceInfoTable = pgTable("device_info", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").notNull().references(() => commandesTable.id, { onDelete: "cascade" }),

  device_type: text("device_type"),
  os_name: text("os_name"),
  os_version: text("os_version"),
  brand_model: text("brand_model"),
  browser_name: text("browser_name"),
  browser_version: text("browser_version"),

  screen_width: integer("screen_width"),
  screen_height: integer("screen_height"),
  pixel_ratio: doublePrecision("pixel_ratio"),
  screen_orientation: text("screen_orientation"),
  cpu_cores: integer("cpu_cores"),
  ram_gb: doublePrecision("ram_gb"),
  touch_support: boolean("touch_support"),

  connection_type: text("connection_type"),
  connection_speed_mbps: doublePrecision("connection_speed_mbps"),
  save_data_mode: boolean("save_data_mode"),

  ip_address: text("ip_address"),
  ip_country: text("ip_country"),
  ip_region: text("ip_region"),
  ip_city: text("ip_city"),
  ip_isp: text("ip_isp"),
  ip_lat_approx: doublePrecision("ip_lat_approx"),
  ip_lng_approx: doublePrecision("ip_lng_approx"),

  timezone: text("timezone"),
  browser_language: text("browser_language"),
  browser_languages: jsonb("browser_languages").$type<string[]>(),
  session_id: text("session_id"),
  page_url: text("page_url"),
  referrer: text("referrer"),
  cookies_enabled: boolean("cookies_enabled"),
  do_not_track: boolean("do_not_track"),

  client_datetime: timestamp("client_datetime", { withTimezone: true }),
  server_datetime: timestamp("server_datetime", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DeviceInfo = typeof deviceInfoTable.$inferSelect;
