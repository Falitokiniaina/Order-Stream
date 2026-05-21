import { Router } from "express";
import { db, articlesTable, commandeItemsTable, reservationsTable, commandesTable } from "@workspace/db";
import { eq, and, gt, sql, max } from "drizzle-orm";

const router = Router();

// Compute real available stock for an article
export async function getStockDisponible(articleId: number, stockTotal: number): Promise<number> {
  // Quantity reserved (active, not expired)
  const reservedResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${reservationsTable.quantite_reservee}), 0)` })
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.article_id, articleId),
        eq(reservationsTable.active, true),
        gt(reservationsTable.expire_at, new Date())
      )
    );
  const reserved = Number(reservedResult[0]?.total ?? 0);

  // Quantity in all committed orders (payée, partiellement livrée, livrée) — tous statuts livraison confondus
  const committedResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${commandeItemsTable.quantite}), 0)` })
    .from(commandeItemsTable)
    .innerJoin(commandesTable, eq(commandeItemsTable.commande_id, commandesTable.id))
    .where(
      and(
        eq(commandeItemsTable.article_id, articleId),
        sql`${commandesTable.statut} IN ('payee', 'livree_partiellement', 'livree')`
      )
    );
  const committed = Number(committedResult[0]?.total ?? 0);

  return Math.max(0, stockTotal - reserved - committed);
}

router.get("/events/:eventId/articles", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  try {
    const articles = await db.select().from(articlesTable)
      .where(eq(articlesTable.evenement_id, eventId))
      .orderBy(articlesTable.display_order, articlesTable.created_at);

    const articlesWithStock = await Promise.all(
      articles.map(async (a) => ({
        ...a,
        prix: parseFloat(a.prix),
        stock_disponible: await getStockDisponible(a.id, a.stock_total),
      }))
    );

    res.json(articlesWithStock);
  } catch (err) {
    req.log.error({ err }, "List articles error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events/:eventId/articles", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  const { nom, description, prix, image_url, stock_total, disponible } = req.body as {
    nom: string; description?: string; prix: number; image_url?: string;
    stock_total?: number; disponible?: boolean;
  };

  if (!nom || prix === undefined) return res.status(400).json({ error: "nom and prix required" });

  try {
    // Auto-assign next display_order (max + 1)
    const [{ maxOrder }] = await db
      .select({ maxOrder: max(articlesTable.display_order) })
      .from(articlesTable)
      .where(eq(articlesTable.evenement_id, eventId));
    const nextOrder = (maxOrder ?? -1) + 1;

    const [article] = await db.insert(articlesTable).values({
      evenement_id: eventId,
      nom,
      description: description ?? null,
      prix: String(prix),
      image_url: image_url ?? null,
      stock_total: stock_total ?? 50,
      disponible: disponible ?? true,
      display_order: nextOrder,
    }).returning();

    res.status(201).json({ ...article, prix: parseFloat(article.prix), stock_disponible: article.stock_total });
  } catch (err) {
    req.log.error({ err }, "Create article error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder: receives ordered array of article IDs, assigns display_order 0..n-1
router.put("/events/:eventId/articles/reorder", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  const { order } = req.body as { order?: number[] };
  if (!Array.isArray(order)) return res.status(400).json({ error: "order array required" });

  try {
    await Promise.all(
      order.map((articleId, index) =>
        db.update(articlesTable)
          .set({ display_order: index })
          .where(and(eq(articlesTable.id, articleId), eq(articlesTable.evenement_id, eventId)))
      )
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Reorder articles error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/articles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { nom, description, prix, image_url, stock_total, disponible, display_order } = req.body as {
    nom?: string; description?: string; prix?: number; image_url?: string;
    stock_total?: number; disponible?: boolean; display_order?: number;
  };

  try {
    const updates: Partial<typeof articlesTable.$inferInsert> = {};
    if (nom !== undefined) updates.nom = nom;
    if (description !== undefined) updates.description = description;
    if (prix !== undefined) updates.prix = String(prix);
    if (image_url !== undefined) updates.image_url = image_url;
    if (stock_total !== undefined) updates.stock_total = stock_total;
    if (disponible !== undefined) updates.disponible = disponible;
    if (display_order !== undefined) updates.display_order = display_order;

    const [article] = await db.update(articlesTable).set(updates).where(eq(articlesTable.id, id)).returning();
    if (!article) return res.status(404).json({ error: "Article not found" });

    const stock_disponible = await getStockDisponible(id, article.stock_total);
    res.json({ ...article, prix: parseFloat(article.prix), stock_disponible });
  } catch (err) {
    req.log.error({ err }, "Update article error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/articles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.delete(articlesTable).where(eq(articlesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete article error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
