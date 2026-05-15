import { Router } from "express";
import { db, evenementsTable, parametrageTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/events", async (req, res) => {
  try {
    const events = await db.select().from(evenementsTable).orderBy(evenementsTable.created_at);
    res.json(events);
  } catch (err) {
    req.log.error({ err }, "List events error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events", async (req, res) => {
  const { nom, slug_url, actif } = req.body as { nom: string; slug_url: string; actif?: boolean };
  if (!nom || !slug_url) return res.status(400).json({ error: "nom and slug_url required" });

  try {
    const [event] = await db.insert(evenementsTable).values({
      nom,
      slug_url: slug_url.toLowerCase().replace(/\s+/g, "-"),
      actif: actif ?? true,
    }).returning();

    // Create default parametrage
    await db.insert(parametrageTable).values({ evenement_id: event.id });

    res.status(201).json(event);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "slug_url already exists" });
    }
    req.log.error({ err }, "Create event error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/slug/:slug", async (req, res) => {
  try {
    const [event] = await db.select().from(evenementsTable)
      .where(eq(evenementsTable.slug_url, req.params.slug.toLowerCase()))
      .limit(1);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    req.log.error({ err }, "Get event by slug error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/events/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [event] = await db.select().from(evenementsTable).where(eq(evenementsTable.id, id)).limit(1);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    req.log.error({ err }, "Get event error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/events/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { nom, slug_url, actif } = req.body as { nom?: string; slug_url?: string; actif?: boolean };
  try {
    const updates: Partial<typeof evenementsTable.$inferInsert> = {};
    if (nom !== undefined) updates.nom = nom;
    if (slug_url !== undefined) updates.slug_url = slug_url.toLowerCase().replace(/\s+/g, "-");
    if (actif !== undefined) updates.actif = actif;

    const [event] = await db.update(evenementsTable).set(updates).where(eq(evenementsTable.id, id)).returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "slug_url already exists" });
    }
    req.log.error({ err }, "Update event error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/events/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.delete(evenementsTable).where(eq(evenementsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete event error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
