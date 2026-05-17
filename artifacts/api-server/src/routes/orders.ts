import { Router } from "express";
import { db, pool, commandesTable, commandeItemsTable, reservationsTable, articlesTable, parametrageTable, evenementsTable } from "@workspace/db";
import { eq, and, gt, sql, inArray } from "drizzle-orm";
import { getStockDisponible } from "./articles";

const router = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(commandesTable).where(eq(commandesTable.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db.select({
    id: commandeItemsTable.id,
    commande_id: commandeItemsTable.commande_id,
    article_id: commandeItemsTable.article_id,
    article_nom: articlesTable.nom,
    quantite: commandeItemsTable.quantite,
    prix_unitaire: commandeItemsTable.prix_unitaire,
    statut_livraison: commandeItemsTable.statut_livraison,
    updated_at: commandeItemsTable.updated_at,
  }).from(commandeItemsTable)
    .leftJoin(articlesTable, eq(commandeItemsTable.article_id, articlesTable.id))
    .where(eq(commandeItemsTable.commande_id, orderId));

  return {
    ...order,
    montant_total: parseFloat(order.montant_total),
    paye_cb: parseFloat(order.paye_cb),
    paye_especes: parseFloat(order.paye_especes),
    paye_cheque: parseFloat(order.paye_cheque),
    items: items.map(i => ({ ...i, prix_unitaire: parseFloat(i.prix_unitaire) })),
  };
}

async function expireOldReservations() {
  await db.update(reservationsTable)
    .set({ active: false })
    .where(and(eq(reservationsTable.active, true), sql`${reservationsTable.expire_at} < NOW()`));

  // Expire commandes whose reservation has expired
  const expiredOrders = await db.select({ id: commandesTable.id })
    .from(commandesTable)
    .where(and(
      eq(commandesTable.statut, "reservee"),
      sql`${commandesTable.expiration_reservation} < NOW()`
    ));
  if (expiredOrders.length > 0) {
    const ids = expiredOrders.map(o => o.id);
    await db.update(commandesTable)
      .set({ statut: "expiree" })
      .where(inArray(commandesTable.id, ids));
  }
}

router.get("/events/:eventId/orders", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  const { statut, search } = req.query as { statut?: string; search?: string };

  try {
    await expireOldReservations();

    let query = db.select().from(commandesTable).where(eq(commandesTable.evenement_id, eventId));

    const orders = await db.select().from(commandesTable)
      .where(eq(commandesTable.evenement_id, eventId))
      .orderBy(commandesTable.created_at);

    const filtered = orders.filter(o => {
      if (statut && o.statut !== statut) return false;
      if (search && !o.nom_commande.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    const withItems = await Promise.all(filtered.map(o => getOrderWithItems(o.id)));
    res.json(withItems.filter(Boolean));
  } catch (err) {
    req.log.error({ err }, "List orders error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events/:eventId/orders", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  const { nom_commande, items } = req.body as {
    nom_commande: string;
    items: { article_id: number; quantite: number }[];
  };

  if (!nom_commande || !items) {
    return res.status(400).json({ error: "nom_commande and items required" });
  }

  const normalizedName = nom_commande.toLowerCase().trim();

  try {
    // Check vente_ouverte
    const event = await db.select().from(evenementsTable).where(eq(evenementsTable.id, eventId)).limit(1);
    if (!event[0]) return res.status(404).json({ error: "Event not found" });

    const params = await db.select().from(parametrageTable).where(eq(parametrageTable.evenement_id, eventId)).limit(1);
    if (params[0] && !params[0].vente_ouverte) {
      return res.status(400).json({ error: "Les ventes sont actuellement fermées." });
    }

    // Check name uniqueness (case-insensitive) — all statuses block reuse
    const existing = await db.select().from(commandesTable)
      .where(and(
        eq(commandesTable.evenement_id, eventId),
        sql`LOWER(${commandesTable.nom_commande}) = ${normalizedName}`
      )).limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: `Le nom "${nom_commande}" est déjà utilisé pour cet événement.`, existingOrder: existing[0] });
    }

    // Get articles and calculate total
    const articleIds = items.map(i => i.article_id);
    const articles = articleIds.length > 0
      ? await db.select().from(articlesTable).where(inArray(articlesTable.id, articleIds))
      : [];
    const articleMap = new Map(articles.map(a => [a.id, a]));

    let montant_total = 0;
    for (const item of items) {
      const article = articleMap.get(item.article_id);
      if (!article) return res.status(400).json({ error: `Article ${item.article_id} not found` });
      if (!article.disponible) return res.status(400).json({ error: `L'article "${article.nom}" n'est pas disponible.` });
      montant_total += parseFloat(article.prix) * item.quantite;
    }

    // Create order
    const [order] = await db.insert(commandesTable).values({
      evenement_id: eventId,
      nom_commande: normalizedName,
      statut: "en_attente",
      montant_total: String(montant_total),
    }).returning();

    // Create items
    for (const item of items) {
      const article = articleMap.get(item.article_id)!;
      await db.insert(commandeItemsTable).values({
        commande_id: order.id,
        article_id: item.article_id,
        quantite: item.quantite,
        prix_unitaire: article.prix,
        statut_livraison: "non_livre",
      });
    }

    const fullOrder = await getOrderWithItems(order.id);
    res.status(201).json(fullOrder);
  } catch (err) {
    req.log.error({ err }, "Create order error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:eventId/orders/by-name/:name", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  const normalizedName = req.params.name.toLowerCase().trim();

  try {
    await expireOldReservations();

    const [order] = await db.select().from(commandesTable)
      .where(and(
        eq(commandesTable.evenement_id, eventId),
        sql`LOWER(${commandesTable.nom_commande}) = ${normalizedName}`
      )).limit(1);

    if (!order) return res.status(404).json({ error: "Order not found" });

    const fullOrder = await getOrderWithItems(order.id);
    res.json(fullOrder);
  } catch (err) {
    req.log.error({ err }, "Get order by name error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await expireOldReservations();
    const order = await getOrderWithItems(id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    req.log.error({ err }, "Get order error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/reserve", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the order row
    const orderResult = await client.query(
      "SELECT * FROM commandes WHERE id = $1 FOR UPDATE",
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }
    const order = orderResult.rows[0];

    if (order.statut !== "en_attente") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Order cannot be reserved in current state" });
    }

    // Get order items
    const itemsResult = await client.query(
      "SELECT ci.*, a.nom as article_nom, a.stock_total FROM commande_items ci JOIN articles a ON ci.article_id = a.id WHERE ci.commande_id = $1",
      [orderId]
    );
    const items = itemsResult.rows;

    // Get event params for reservation duration
    const paramsResult = await client.query(
      "SELECT temps_reservation_minutes FROM parametrage WHERE evenement_id = $1",
      [order.evenement_id]
    );
    const minutes = paramsResult.rows[0]?.temps_reservation_minutes ?? 20;
    const expireAt = new Date(Date.now() + minutes * 60 * 1000);

    // Check stock for each item
    for (const item of items) {
      const stockResult = await client.query(`
        SELECT
          a.stock_total -
          COALESCE((SELECT SUM(r.quantite_reservee) FROM reservations r WHERE r.article_id = a.id AND r.active = true AND r.expire_at > NOW()), 0) -
          COALESCE((SELECT SUM(ci2.quantite) FROM commande_items ci2 JOIN commandes c2 ON ci2.commande_id = c2.id WHERE ci2.article_id = a.id AND ci2.statut_livraison = 'non_livre' AND c2.statut IN ('payee', 'livree_partiellement')), 0)
          AS stock_disponible
        FROM articles a WHERE a.id = $1 FOR UPDATE
      `, [item.article_id]);

      const stockDisponible = parseInt(stockResult.rows[0]?.stock_disponible ?? 0);

      if (stockDisponible < item.quantite) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `L'article "${item.article_nom}" n'est plus disponible en quantité souhaitée. Veuillez modifier votre commande.`,
          article: item.article_nom
        });
      }

      // Create reservation
      await client.query(
        "INSERT INTO reservations (commande_id, article_id, quantite_reservee, expire_at, active) VALUES ($1, $2, $3, $4, true)",
        [orderId, item.article_id, item.quantite, expireAt]
      );
    }

    // Update order status
    await client.query(
      "UPDATE commandes SET statut = 'reservee', expiration_reservation = $1, updated_at = NOW() WHERE id = $2",
      [expireAt, orderId]
    );

    await client.query("COMMIT");

    const fullOrder = await getOrderWithItems(orderId);
    res.json(fullOrder);
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ err }, "Reserve order error");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.put("/orders/:id/items", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid id" });

  const { items } = req.body as { items: { article_id: number; quantite: number }[] };
  if (!items || items.length === 0) return res.status(400).json({ error: "Items required" });

  const order = await db.select().from(commandesTable).where(eq(commandesTable.id, orderId)).limit(1);
  if (!order.length) return res.status(404).json({ error: "Order not found" });
  if (order[0].statut !== "en_attente") return res.status(400).json({ error: "Can only update items for en_attente orders" });

  const articleIds = items.map(i => i.article_id);
  const articles = await db.select().from(articlesTable).where(inArray(articlesTable.id, articleIds));

  await db.delete(commandeItemsTable).where(eq(commandeItemsTable.commande_id, orderId));

  let total = 0;
  for (const item of items) {
    const article = articles.find(a => a.id === item.article_id);
    if (!article) continue;
    const lineTotal = article.prix * item.quantite;
    total += lineTotal;
    await db.insert(commandeItemsTable).values({
      commande_id: orderId,
      article_id: item.article_id,
      quantite: item.quantite,
      prix_unitaire: article.prix,
      statut_livraison: "non_livre"
    });
  }

  await db.update(commandesTable).set({ montant_total: total.toString(), updated_at: new Date() }).where(eq(commandesTable.id, orderId));
  const fullOrder = await getOrderWithItems(orderId);
  res.json(fullOrder);
});

router.post("/orders/:id/reactivate", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query("SELECT * FROM commandes WHERE id = $1 FOR UPDATE", [orderId]);
    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }
    const order = orderResult.rows[0];

    if (order.statut !== "expiree") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Only expired orders can be reactivated" });
    }

    const itemsResult = await client.query(
      "SELECT ci.*, a.nom as article_nom, a.disponible as article_disponible FROM commande_items ci JOIN articles a ON ci.article_id = a.id WHERE ci.commande_id = $1",
      [orderId]
    );
    const items = itemsResult.rows;

    // Check that all articles are still available for sale
    const unavailableItems = items.filter((item: any) => !item.article_disponible);
    if (unavailableItems.length > 0) {
      await client.query("ROLLBACK");
      const names = unavailableItems.map((i: any) => i.article_nom).join(", ");
      return res.status(400).json({
        error: "Certains articles ne sont plus en vente",
        unavailable: unavailableItems.map((i: any) => ({ article: i.article_nom }))
      });
    }

    const paramsResult = await client.query(
      "SELECT temps_reservation_minutes FROM parametrage WHERE evenement_id = $1",
      [order.evenement_id]
    );
    const minutes = paramsResult.rows[0]?.temps_reservation_minutes ?? 20;
    const expireAt = new Date(Date.now() + minutes * 60 * 1000);

    const insufficientItems: { article: string; demande: number; disponible: number }[] = [];
    for (const item of items) {
      const stockResult = await client.query(`
        SELECT a.stock_total
          - COALESCE((SELECT SUM(r.quantite_reservee) FROM reservations r WHERE r.article_id = a.id AND r.active = true AND r.expire_at > NOW()), 0)
          - COALESCE((SELECT SUM(ci2.quantite) FROM commande_items ci2 JOIN commandes c2 ON ci2.commande_id = c2.id WHERE ci2.article_id = a.id AND ci2.statut_livraison = 'non_livre' AND c2.statut IN ('payee', 'livree_partiellement')), 0)
          AS stock_disponible
        FROM articles a WHERE a.id = $1 FOR UPDATE
      `, [item.article_id]);
      const stockDisponible = parseInt(stockResult.rows[0]?.stock_disponible ?? 0);
      if (stockDisponible < item.quantite) {
        insufficientItems.push({ article: item.article_nom, demande: item.quantite, disponible: stockDisponible });
      }
    }

    if (insufficientItems.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Stock insuffisant pour réactiver la commande", details: insufficientItems });
    }

    for (const item of items) {
      await client.query(
        "INSERT INTO reservations (commande_id, article_id, quantite_reservee, expire_at, active) VALUES ($1, $2, $3, $4, true)",
        [orderId, item.article_id, item.quantite, expireAt]
      );
    }

    await client.query(
      "UPDATE commandes SET statut = 'reservee', expiration_reservation = $1, updated_at = NOW() WHERE id = $2",
      [expireAt, orderId]
    );

    await client.query("COMMIT");
    const fullOrder = await getOrderWithItems(orderId);
    res.json(fullOrder);
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ err }, "Reactivate order error");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.post("/orders/:id/cancel-reservation", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query("SELECT * FROM commandes WHERE id = $1 FOR UPDATE", [orderId]);
    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }
    const order = orderResult.rows[0];

    if (order.statut !== "reservee") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "La commande doit être en statut 'reservee' pour annuler la réservation" });
    }

    await client.query("UPDATE reservations SET active = false WHERE commande_id = $1", [orderId]);
    await client.query(
      "UPDATE commandes SET statut = 'en_attente', expiration_reservation = NULL, updated_at = NOW() WHERE id = $1",
      [orderId]
    );

    await client.query("COMMIT");
    const fullOrder = await getOrderWithItems(orderId);
    res.json(fullOrder);
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ err }, "Cancel reservation error");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.post("/orders/:id/pay", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid id" });

  const { paye_cb, paye_especes, paye_cheque } = req.body as {
    paye_cb: number; paye_especes: number; paye_cheque: number;
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      "SELECT * FROM commandes WHERE id = $1 FOR UPDATE",
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }
    const order = orderResult.rows[0];

    if (order.statut !== "reservee") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Order must be in 'reservee' status to pay" });
    }

    // Validate payment total
    const total = (paye_cb || 0) + (paye_especes || 0) + (paye_cheque || 0);
    const montant = parseFloat(order.montant_total);
    if (Math.abs(total - montant) > 0.01) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Le total des paiements (${total.toFixed(2)}€) ne correspond pas au montant dû (${montant.toFixed(2)}€).`
      });
    }

    // Verify stock is still OK
    const itemsResult = await client.query(
      "SELECT ci.*, a.nom as article_nom, a.stock_total FROM commande_items ci JOIN articles a ON ci.article_id = a.id WHERE ci.commande_id = $1",
      [orderId]
    );

    for (const item of itemsResult.rows) {
      const stockResult = await client.query(`
        SELECT
          a.stock_total -
          COALESCE((SELECT SUM(r.quantite_reservee) FROM reservations r WHERE r.article_id = a.id AND r.active = true AND r.expire_at > NOW()), 0) -
          COALESCE((SELECT SUM(ci2.quantite) FROM commande_items ci2 JOIN commandes c2 ON ci2.commande_id = c2.id WHERE ci2.article_id = a.id AND ci2.statut_livraison = 'non_livre' AND c2.statut IN ('payee', 'livree_partiellement')), 0)
          AS stock_disponible
        FROM articles a WHERE a.id = $1 FOR UPDATE
      `, [item.article_id]);

      const stockDisponible = parseInt(stockResult.rows[0]?.stock_disponible ?? 0);

      // The reservation itself occupies stock, so we need >= 0 (it's already reserved)
      // Allow if stock_disponible >= 0 (the reservation already counted)
    }

    // Deactivate reservations for this order
    await client.query(
      "UPDATE reservations SET active = false WHERE commande_id = $1",
      [orderId]
    );

    // Update order
    await client.query(
      "UPDATE commandes SET statut = 'payee', paye_cb = $1, paye_especes = $2, paye_cheque = $3, updated_at = NOW() WHERE id = $4",
      [paye_cb || 0, paye_especes || 0, paye_cheque || 0, orderId]
    );

    await client.query("COMMIT");

    const fullOrder = await getOrderWithItems(orderId);
    res.json(fullOrder);
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ err }, "Pay order error");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.post("/orders/:id/deliver", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [order] = await db.select().from(commandesTable).where(eq(commandesTable.id, orderId)).limit(1);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!["payee", "livree_partiellement"].includes(order.statut)) {
      return res.status(400).json({ error: "Order must be payee or livree_partiellement to deliver" });
    }

    await db.update(commandeItemsTable)
      .set({ statut_livraison: "livre" })
      .where(eq(commandeItemsTable.commande_id, orderId));

    await db.update(commandesTable)
      .set({ statut: "livree" })
      .where(eq(commandesTable.id, orderId));

    const fullOrder = await getOrderWithItems(orderId);
    res.json(fullOrder);
  } catch (err) {
    req.log.error({ err }, "Deliver order error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/deliver-partial", async (req, res) => {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) return res.status(400).json({ error: "Invalid id" });

  const { item_ids } = req.body as { item_ids: number[] };
  if (!item_ids || item_ids.length === 0) {
    return res.status(400).json({ error: "item_ids required" });
  }

  try {
    const [order] = await db.select().from(commandesTable).where(eq(commandesTable.id, orderId)).limit(1);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!["payee", "livree_partiellement"].includes(order.statut)) {
      return res.status(400).json({ error: "Order must be payee or livree_partiellement to deliver" });
    }

    // Mark selected items as livre
    await db.update(commandeItemsTable)
      .set({ statut_livraison: "livre" })
      .where(and(
        eq(commandeItemsTable.commande_id, orderId),
        inArray(commandeItemsTable.id, item_ids)
      ));

    // Check if all items are now delivered
    const allItems = await db.select().from(commandeItemsTable)
      .where(eq(commandeItemsTable.commande_id, orderId));

    const allDelivered = allItems.every(i => i.statut_livraison === "livre");
    const newStatut = allDelivered ? "livree" : "livree_partiellement";

    await db.update(commandesTable)
      .set({ statut: newStatut })
      .where(eq(commandesTable.id, orderId));

    const fullOrder = await getOrderWithItems(orderId);
    res.json(fullOrder);
  } catch (err) {
    req.log.error({ err }, "Deliver partial order error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
