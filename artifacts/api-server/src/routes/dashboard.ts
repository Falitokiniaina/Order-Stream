import { Router } from "express";
import { db, commandesTable, commandeItemsTable, articlesTable } from "@workspace/db";
import { eq, and, sql, gte } from "drizzle-orm";

const router = Router();

router.get("/events/:eventId/dashboard", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  try {
    // Revenue stats (from paid orders)
    const revenueResult = await db.select({
      ca_total: sql<number>`COALESCE(SUM(CAST(${commandesTable.montant_total} AS NUMERIC)), 0)`,
      ca_cb: sql<number>`COALESCE(SUM(CAST(${commandesTable.paye_cb} AS NUMERIC)), 0)`,
      ca_especes: sql<number>`COALESCE(SUM(CAST(${commandesTable.paye_especes} AS NUMERIC)), 0)`,
      ca_cheque: sql<number>`COALESCE(SUM(CAST(${commandesTable.paye_cheque} AS NUMERIC)), 0)`,
    }).from(commandesTable)
      .where(and(
        eq(commandesTable.evenement_id, eventId),
        sql`${commandesTable.statut} IN ('payee', 'livree_partiellement', 'livree')`
      ));

    // Order counts by status
    const countResult = await db.select({
      statut: commandesTable.statut,
      count: sql<number>`COUNT(*)`,
    }).from(commandesTable)
      .where(eq(commandesTable.evenement_id, eventId))
      .groupBy(commandesTable.statut);

    const counts: Record<string, number> = {};
    for (const row of countResult) {
      counts[row.statut] = Number(row.count);
    }

    // Top articles by quantity sold
    const topArticlesResult = await db.select({
      article_id: commandeItemsTable.article_id,
      nom: articlesTable.nom,
      total_vendu: sql<number>`COALESCE(SUM(${commandeItemsTable.quantite}), 0)`,
      chiffre_affaires: sql<number>`COALESCE(SUM(${commandeItemsTable.quantite} * CAST(${commandeItemsTable.prix_unitaire} AS NUMERIC)), 0)`,
    }).from(commandeItemsTable)
      .innerJoin(commandesTable, eq(commandeItemsTable.commande_id, commandesTable.id))
      .innerJoin(articlesTable, eq(commandeItemsTable.article_id, articlesTable.id))
      .where(and(
        eq(commandesTable.evenement_id, eventId),
        sql`${commandesTable.statut} IN ('payee', 'livree_partiellement', 'livree')`
      ))
      .groupBy(commandeItemsTable.article_id, articlesTable.nom)
      .orderBy(sql`SUM(${commandeItemsTable.quantite}) DESC`)
      .limit(10);

    const revenue = revenueResult[0];

    res.json({
      ca_total: Number(revenue.ca_total),
      ca_cb: Number(revenue.ca_cb),
      ca_especes: Number(revenue.ca_especes),
      ca_cheque: Number(revenue.ca_cheque),
      nb_commandes_en_attente: counts["en_attente"] ?? 0,
      nb_commandes_reservees: counts["reservee"] ?? 0,
      nb_commandes_payees: counts["payee"] ?? 0,
      nb_commandes_livrees_partiellement: counts["livree_partiellement"] ?? 0,
      nb_commandes_livrees: counts["livree"] ?? 0,
      nb_commandes_expirees: counts["expiree"] ?? 0,
      top_articles: topArticlesResult.map(a => ({
        article_id: a.article_id,
        nom: a.nom,
        total_vendu: Number(a.total_vendu),
        chiffre_affaires: Number(a.chiffre_affaires),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:eventId/orders/summary", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  try {
    // Expire old reservations first
    await db.update(commandesTable)
      .set({ statut: "expiree" })
      .where(and(
        eq(commandesTable.evenement_id, eventId),
        eq(commandesTable.statut, "reservee"),
        sql`${commandesTable.expiration_reservation} < NOW()`
      ));

    const countResult = await db.select({
      statut: commandesTable.statut,
      count: sql<number>`COUNT(*)`,
    }).from(commandesTable)
      .where(eq(commandesTable.evenement_id, eventId))
      .groupBy(commandesTable.statut);

    const counts: Record<string, number> = {};
    for (const row of countResult) {
      counts[row.statut] = Number(row.count);
    }

    // Delivered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [livreedAujourdhuiResult] = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(commandesTable)
      .where(and(
        eq(commandesTable.evenement_id, eventId),
        eq(commandesTable.statut, "livree"),
        gte(commandesTable.updated_at, today)
      ));

    // Articles to prepare (non-delivered items in paid orders)
    const [articlesResult] = await db.select({
      total: sql<number>`COALESCE(SUM(${commandeItemsTable.quantite}), 0)`
    }).from(commandeItemsTable)
      .innerJoin(commandesTable, eq(commandeItemsTable.commande_id, commandesTable.id))
      .where(and(
        eq(commandesTable.evenement_id, eventId),
        eq(commandeItemsTable.statut_livraison, "non_livre"),
        sql`${commandesTable.statut} IN ('payee', 'livree_partiellement')`
      ));

    res.json({
      en_attente: counts["en_attente"] ?? 0,
      reservee: counts["reservee"] ?? 0,
      payee: counts["payee"] ?? 0,
      livree_partiellement: counts["livree_partiellement"] ?? 0,
      livree: counts["livree"] ?? 0,
      expiree: counts["expiree"] ?? 0,
      livrees_aujourd_hui: Number(livreedAujourdhuiResult?.count ?? 0),
      articles_a_preparer: Number(articlesResult?.total ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Orders summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
