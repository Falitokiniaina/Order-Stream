import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evenementsTable = pgTable("evenements", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  slug_url: text("slug_url").notNull().unique(),
  actif: boolean("actif").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEvenementSchema = createInsertSchema(evenementsTable).omit({ id: true, created_at: true });
export type InsertEvenement = z.infer<typeof insertEvenementSchema>;
export type Evenement = typeof evenementsTable.$inferSelect;
