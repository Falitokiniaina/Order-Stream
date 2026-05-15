import { pgTable, serial, integer, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { evenementsTable } from "./evenements";

export const commandesTable = pgTable("commandes", {
  id: serial("id").primaryKey(),
  evenement_id: integer("evenement_id").notNull().references(() => evenementsTable.id, { onDelete: "cascade" }),
  nom_commande: text("nom_commande").notNull(),
  statut: text("statut", {
    enum: ["en_attente", "reservee", "payee", "livree_partiellement", "livree", "expiree"],
  }).notNull().default("en_attente"),
  montant_total: numeric("montant_total", { precision: 10, scale: 2 }).notNull().default("0"),
  paye_cb: numeric("paye_cb", { precision: 10, scale: 2 }).notNull().default("0"),
  paye_especes: numeric("paye_especes", { precision: 10, scale: 2 }).notNull().default("0"),
  paye_cheque: numeric("paye_cheque", { precision: 10, scale: 2 }).notNull().default("0"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  expiration_reservation: timestamp("expiration_reservation", { withTimezone: true }),
});

export const commandeItemsTable = pgTable("commande_items", {
  id: serial("id").primaryKey(),
  commande_id: integer("commande_id").notNull().references(() => commandesTable.id, { onDelete: "cascade" }),
  article_id: integer("article_id").notNull(),
  quantite: integer("quantite").notNull(),
  prix_unitaire: numeric("prix_unitaire", { precision: 10, scale: 2 }).notNull(),
  statut_livraison: text("statut_livraison", {
    enum: ["non_livre", "livre"],
  }).notNull().default("non_livre"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  commande_id: integer("commande_id").notNull().references(() => commandesTable.id, { onDelete: "cascade" }),
  article_id: integer("article_id").notNull(),
  quantite_reservee: integer("quantite_reservee").notNull(),
  expire_at: timestamp("expire_at", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertCommandeSchema = createInsertSchema(commandesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertCommande = z.infer<typeof insertCommandeSchema>;
export type Commande = typeof commandesTable.$inferSelect;
export type CommandeItem = typeof commandeItemsTable.$inferSelect;
export type Reservation = typeof reservationsTable.$inferSelect;
