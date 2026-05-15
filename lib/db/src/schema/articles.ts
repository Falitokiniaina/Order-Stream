import { pgTable, serial, integer, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { evenementsTable } from "./evenements";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  evenement_id: integer("evenement_id").notNull().references(() => evenementsTable.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  description: text("description"),
  prix: numeric("prix", { precision: 10, scale: 2 }).notNull(),
  image_url: text("image_url"),
  stock_total: integer("stock_total").notNull().default(50),
  disponible: boolean("disponible").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, created_at: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
