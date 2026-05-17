import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { evenementsTable } from "./evenements";

export const parametrageTable = pgTable("parametrage", {
  id: serial("id").primaryKey(),
  evenement_id: integer("evenement_id").notNull().references(() => evenementsTable.id, { onDelete: "cascade" }),
  temps_reservation_minutes: integer("temps_reservation_minutes").notNull().default(20),
  mdp_caisse: text("mdp_caisse").notNull().default("caisse123"),
  mdp_preparateur: text("mdp_preparateur").notNull().default("prep123"),
  mdp_admin: text("mdp_admin").notNull().default("admin123"),
  vente_ouverte: boolean("vente_ouverte").notNull().default(true),
  allow_reprendre_commande: boolean("allow_reprendre_commande").notNull().default(false),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertParametrageSchema = createInsertSchema(parametrageTable).omit({ id: true, updated_at: true });
export type InsertParametrage = z.infer<typeof insertParametrageSchema>;
export type Parametrage = typeof parametrageTable.$inferSelect;
