import { Router } from "express";
import { db, systemSettingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const DEFAULT_FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#C53030"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><path d="M20 3 L8 17 H15 L12 29 L24 15 H17 Z" fill="white"/></svg>';

async function getOrInitSystemSettings() {
  const [existing] = await db.select().from(systemSettingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(systemSettingsTable).values({
    mdp_admin: "admin123",
    favicon_svg: DEFAULT_FAVICON_SVG,
  }).returning();
  return created;
}

router.get("/system/settings", async (req, res) => {
  try {
    const settings = await getOrInitSystemSettings();
    res.json({
      mdp_admin: settings.mdp_admin,
      favicon_svg: settings.favicon_svg,
      updated_at: settings.updated_at,
    });
  } catch (err) {
    req.log.error({ err }, "Get system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/system/settings", async (req, res) => {
  const { mdp_admin, favicon_svg } = req.body as { mdp_admin?: string; favicon_svg?: string };

  try {
    const existing = await getOrInitSystemSettings();
    const updates: { mdp_admin?: string; favicon_svg?: string; updated_at: Date } = { updated_at: new Date() };
    if (mdp_admin !== undefined && mdp_admin.trim() !== "") updates.mdp_admin = mdp_admin;
    if (favicon_svg !== undefined && favicon_svg.trim() !== "") updates.favicon_svg = favicon_svg;

    const [updated] = await db.update(systemSettingsTable)
      .set(updates)
      .where(sql`id = ${existing.id}`)
      .returning();

    res.json({
      mdp_admin: updated.mdp_admin,
      favicon_svg: updated.favicon_svg,
      updated_at: updated.updated_at,
    });
  } catch (err) {
    req.log.error({ err }, "Update system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/system/favicon.svg", async (req, res) => {
  try {
    const settings = await getOrInitSystemSettings();
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(settings.favicon_svg);
  } catch (err) {
    req.log.error({ err }, "Get favicon error");
    res.status(500).send("");
  }
});

export { getOrInitSystemSettings };
export default router;
