import { Router } from "express";
import { db, systemSettingsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

async function getOrInitSystemSettings() {
  const [existing] = await db.select().from(systemSettingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(systemSettingsTable).values({ mdp_admin: "admin123" }).returning();
  return created;
}

router.get("/system/settings", async (req, res) => {
  try {
    const settings = await getOrInitSystemSettings();
    res.json({ mdp_admin: settings.mdp_admin, updated_at: settings.updated_at });
  } catch (err) {
    req.log.error({ err }, "Get system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/system/settings", async (req, res) => {
  const { mdp_admin } = req.body as { mdp_admin?: string };

  try {
    const existing = await getOrInitSystemSettings();
    const updates: { mdp_admin?: string; updated_at: Date } = { updated_at: new Date() };
    if (mdp_admin !== undefined && mdp_admin.trim() !== "") updates.mdp_admin = mdp_admin;

    const [updated] = await db.update(systemSettingsTable)
      .set(updates)
      .where(sql`id = ${existing.id}`)
      .returning();

    res.json({ mdp_admin: updated.mdp_admin, updated_at: updated.updated_at });
  } catch (err) {
    req.log.error({ err }, "Update system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { getOrInitSystemSettings };
export default router;
