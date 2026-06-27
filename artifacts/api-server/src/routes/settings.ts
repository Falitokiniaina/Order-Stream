import { Router } from "express";
import { db, parametrageTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/events/:eventId/settings", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  try {
    const [settings] = await db.select({
      id: parametrageTable.id,
      evenement_id: parametrageTable.evenement_id,
      temps_reservation_minutes: parametrageTable.temps_reservation_minutes,
      vente_ouverte: parametrageTable.vente_ouverte,
      allow_reprendre_commande: parametrageTable.allow_reprendre_commande,
      updated_at: parametrageTable.updated_at,
    }).from(parametrageTable).where(eq(parametrageTable.evenement_id, eventId)).limit(1);

    if (!settings) return res.status(404).json({ error: "Settings not found" });
    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Get settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/events/:eventId/settings", async (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

  const { temps_reservation_minutes, mdp_caisse, mdp_preparateur, mdp_admin, mdp_admin_local, vente_ouverte, allow_reprendre_commande } = req.body as {
    temps_reservation_minutes?: number;
    mdp_caisse?: string;
    mdp_preparateur?: string;
    mdp_admin?: string;
    mdp_admin_local?: string;
    vente_ouverte?: boolean;
    allow_reprendre_commande?: boolean;
  };

  try {
    const updates: Partial<typeof parametrageTable.$inferInsert> = {};
    if (temps_reservation_minutes !== undefined) updates.temps_reservation_minutes = temps_reservation_minutes;
    if (mdp_caisse !== undefined) updates.mdp_caisse = mdp_caisse;
    if (mdp_preparateur !== undefined) updates.mdp_preparateur = mdp_preparateur;
    if (mdp_admin !== undefined) updates.mdp_admin = mdp_admin;
    if (mdp_admin_local !== undefined) updates.mdp_admin_local = mdp_admin_local;
    if (vente_ouverte !== undefined) updates.vente_ouverte = vente_ouverte;
    if (allow_reprendre_commande !== undefined) updates.allow_reprendre_commande = allow_reprendre_commande;

    const [settings] = await db.update(parametrageTable)
      .set(updates)
      .where(eq(parametrageTable.evenement_id, eventId))
      .returning();

    if (!settings) return res.status(404).json({ error: "Settings not found" });

    res.json({
      id: settings.id,
      evenement_id: settings.evenement_id,
      temps_reservation_minutes: settings.temps_reservation_minutes,
      vente_ouverte: settings.vente_ouverte,
      allow_reprendre_commande: settings.allow_reprendre_commande,
      updated_at: settings.updated_at,
    });
  } catch (err) {
    req.log.error({ err }, "Update settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
