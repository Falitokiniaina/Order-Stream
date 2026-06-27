import { Router } from "express";
import { db, pool, eventSnapshotsTable, articlesTable, parametrageTable, commandesTable, commandeItemsTable, reservationsTable, deviceInfoTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

// ── List snapshots ────────────────────────────────────────────────────────────
router.get("/events/:eventId/snapshots", async (req, res) => {
  const eventId = parseInt(req.params["eventId"]);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  try {
    const rows = await db
      .select()
      .from(eventSnapshotsTable)
      .where(eq(eventSnapshotsTable.event_id, eventId))
      .orderBy(eventSnapshotsTable.created_at);

    const snapshots = rows.map(r => {
      const data = r.snapshot as Record<string, unknown[]>;
      return {
        id: r.id,
        event_id: r.event_id,
        label: r.label,
        created_at: r.created_at,
        article_count: (data["articles"] ?? []).length,
        commande_count: (data["commandes"] ?? []).length,
      };
    });

    res.json(snapshots);
  } catch (err) {
    req.log.error({ err }, "List snapshots error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Create snapshot ───────────────────────────────────────────────────────────
router.post("/events/:eventId/snapshots", async (req, res) => {
  const eventId = parseInt(req.params["eventId"]);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  const { label } = req.body as { label?: string };
  if (!label?.trim()) return res.status(400).json({ error: "label is required" });

  try {
    // Read all event data
    const [articles, [parametrage], commandes] = await Promise.all([
      db.select().from(articlesTable).where(eq(articlesTable.evenement_id, eventId)),
      db.select().from(parametrageTable).where(eq(parametrageTable.evenement_id, eventId)).limit(1),
      db.select().from(commandesTable).where(eq(commandesTable.evenement_id, eventId)),
    ]);

    const commandeIds = commandes.map(c => c.id);

    const [commande_items, reservations, device_info] = commandeIds.length > 0
      ? await Promise.all([
          db.select().from(commandeItemsTable).where(inArray(commandeItemsTable.commande_id, commandeIds)),
          db.select().from(reservationsTable).where(inArray(reservationsTable.commande_id, commandeIds)),
          db.select().from(deviceInfoTable).where(inArray(deviceInfoTable.order_id, commandeIds)),
        ])
      : [[], [], []];

    const snapshot = { articles, parametrage: parametrage ?? null, commandes, commande_items, reservations, device_info };

    const [created] = await db.insert(eventSnapshotsTable).values({
      event_id: eventId,
      label: label.trim(),
      snapshot,
    }).returning();

    res.status(201).json({
      id: created.id,
      event_id: created.event_id,
      label: created.label,
      created_at: created.created_at,
      article_count: articles.length,
      commande_count: commandes.length,
    });
  } catch (err) {
    req.log.error({ err }, "Create snapshot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Delete snapshot ───────────────────────────────────────────────────────────
router.delete("/events/:eventId/snapshots/:snapId", async (req, res) => {
  const eventId = parseInt(req.params["eventId"]);
  const snapId = parseInt(req.params["snapId"]);
  if (isNaN(eventId) || isNaN(snapId)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(eventSnapshotsTable)
      .where(eq(eventSnapshotsTable.id, snapId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete snapshot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Restore snapshot ──────────────────────────────────────────────────────────
router.post("/events/:eventId/snapshots/:snapId/restore", async (req, res) => {
  const eventId = parseInt(req.params["eventId"]);
  const snapId = parseInt(req.params["snapId"]);
  if (isNaN(eventId) || isNaN(snapId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [snap] = await db.select().from(eventSnapshotsTable)
      .where(eq(eventSnapshotsTable.id, snapId)).limit(1);
    if (!snap) return res.status(404).json({ error: "Snapshot not found" });

    const data = snap.snapshot as {
      articles: typeof articlesTable.$inferSelect[];
      parametrage: typeof parametrageTable.$inferSelect | null;
      commandes: typeof commandesTable.$inferSelect[];
      commande_items: typeof commandeItemsTable.$inferSelect[];
      reservations: typeof reservationsTable.$inferSelect[];
      device_info: typeof deviceInfoTable.$inferSelect[];
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Fetch current commande IDs for this event to cascade-delete child rows
      const { rows: cmdRows } = await client.query<{ id: number }>(
        "SELECT id FROM commandes WHERE evenement_id = $1",
        [eventId]
      );
      const currentCmdIds = cmdRows.map(r => r.id);

      if (currentCmdIds.length > 0) {
        const ids = currentCmdIds.join(",");
        await client.query(`DELETE FROM device_info WHERE order_id IN (${ids})`);
        await client.query(`DELETE FROM reservations WHERE commande_id IN (${ids})`);
        await client.query(`DELETE FROM commande_items WHERE commande_id IN (${ids})`);
        await client.query(`DELETE FROM commandes WHERE id IN (${ids})`);
      }

      await client.query("DELETE FROM articles WHERE evenement_id = $1", [eventId]);

      // 2. Restore articles
      for (const a of data.articles) {
        await client.query(
          `INSERT INTO articles (id, evenement_id, nom, description, prix, image_url, stock_total, disponible, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [a.id, a.evenement_id, a.nom, a.description ?? null, a.prix, a.image_url ?? null, a.stock_total, a.disponible, a.created_at]
        );
      }

      // 3. Restore parametrage (mdp_admin is now global in system_settings, not per-event)
      if (data.parametrage) {
        const p = data.parametrage as Record<string, unknown>;
        await client.query(
          `UPDATE parametrage SET
             temps_reservation_minutes=$1, mdp_caisse=$2, mdp_preparateur=$3,
             mdp_admin_local=$4, vente_ouverte=$5, allow_reprendre_commande=$6
           WHERE evenement_id=$7`,
          [p["temps_reservation_minutes"], p["mdp_caisse"], p["mdp_preparateur"],
           p["mdp_admin_local"] ?? p["mdp_admin"] ?? "admin123",
           p["vente_ouverte"], p["allow_reprendre_commande"], eventId]
        );
      }

      // 4. Restore commandes
      for (const c of data.commandes) {
        await client.query(
          `INSERT INTO commandes (id, evenement_id, nom_commande, statut, montant_total, paye_cb, paye_especes, paye_cheque, created_at, updated_at, expiration_reservation)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [c.id, c.evenement_id, c.nom_commande, c.statut, c.montant_total, c.paye_cb, c.paye_especes, c.paye_cheque, c.created_at, c.updated_at, c.expiration_reservation ?? null]
        );
      }

      // 5. Restore commande_items
      for (const ci of data.commande_items) {
        await client.query(
          `INSERT INTO commande_items (id, commande_id, article_id, quantite, prix_unitaire, statut_livraison, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [ci.id, ci.commande_id, ci.article_id, ci.quantite, ci.prix_unitaire, ci.statut_livraison, ci.updated_at]
        );
      }

      // 6. Restore reservations
      for (const r of data.reservations) {
        await client.query(
          `INSERT INTO reservations (id, commande_id, article_id, quantite_reservee, expire_at, active)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [r.id, r.commande_id, r.article_id, r.quantite_reservee, r.expire_at, r.active]
        );
      }

      // 7. Restore device_info
      for (const d of data.device_info) {
        await client.query(
          `INSERT INTO device_info (
             id, order_id, device_type, os_name, os_version, brand_model,
             browser_name, browser_version, screen_width, screen_height,
             pixel_ratio, screen_orientation, cpu_cores, ram_gb, touch_support,
             connection_type, connection_speed_mbps, save_data_mode,
             ip_address, ip_country, ip_region, ip_city, ip_isp, ip_lat_approx, ip_lng_approx,
             timezone, browser_language, browser_languages, session_id,
             page_url, referrer, cookies_enabled, do_not_track,
             client_datetime, server_datetime, created_at
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
             $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36
           )`,
          [
            d.id, d.order_id, d.device_type, d.os_name, d.os_version, d.brand_model,
            d.browser_name, d.browser_version, d.screen_width, d.screen_height,
            d.pixel_ratio, d.screen_orientation, d.cpu_cores, d.ram_gb, d.touch_support,
            d.connection_type, d.connection_speed_mbps, d.save_data_mode,
            d.ip_address, d.ip_country, d.ip_region, d.ip_city, d.ip_isp, d.ip_lat_approx, d.ip_lng_approx,
            d.timezone, d.browser_language,
            d.browser_languages ? JSON.stringify(d.browser_languages) : null,
            d.session_id, d.page_url, d.referrer, d.cookies_enabled, d.do_not_track,
            d.client_datetime, d.server_datetime, d.created_at,
          ]
        );
      }

      // 8. Reset sequences so new inserts don't conflict with restored IDs
      await client.query(`
        SELECT setval(pg_get_serial_sequence('articles', 'id'),       COALESCE((SELECT MAX(id) FROM articles), 1));
        SELECT setval(pg_get_serial_sequence('commandes', 'id'),      COALESCE((SELECT MAX(id) FROM commandes), 1));
        SELECT setval(pg_get_serial_sequence('commande_items', 'id'), COALESCE((SELECT MAX(id) FROM commande_items), 1));
        SELECT setval(pg_get_serial_sequence('reservations', 'id'),   COALESCE((SELECT MAX(id) FROM reservations), 1));
        SELECT setval(pg_get_serial_sequence('device_info', 'id'),    COALESCE((SELECT MAX(id) FROM device_info), 1));
      `);

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log.error({ err }, "Restore snapshot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
