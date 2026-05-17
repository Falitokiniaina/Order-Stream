import { Router } from "express";
import { db, parametrageTable, evenementsTable, sessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

const router = Router();

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function getSession(token: string) {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);
  if (!session) return null;
  if (session.expires_at < new Date()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }
  return { role: session.role, eventSlug: session.event_slug };
}

async function purgeExpiredSessions() {
  await db.delete(sessionsTable).where(lt(sessionsTable.expires_at, new Date()));
}

router.post("/auth/login", async (req, res) => {
  const { password, role, eventSlug } = req.body as { password: string; role: string; eventSlug?: string };

  if (!password || !role) {
    return res.status(400).json({ error: "Missing password or role" });
  }

  try {
    let valid = false;

    if (role === "admin") {
      if (eventSlug) {
        const event = await db.select().from(evenementsTable).where(eq(evenementsTable.slug_url, eventSlug)).limit(1);
        if (event.length > 0) {
          const params = await db.select().from(parametrageTable).where(eq(parametrageTable.evenement_id, event[0].id)).limit(1);
          if (params.length > 0 && params[0].mdp_admin === password) valid = true;
        }
      }
      if (!valid) {
        const allParams = await db.select().from(parametrageTable);
        valid = allParams.some(p => p.mdp_admin === password);
      }
    } else if (role === "caisse" || role === "preparateur") {
      if (!eventSlug) return res.status(400).json({ error: "eventSlug required for this role" });
      const event = await db.select().from(evenementsTable).where(eq(evenementsTable.slug_url, eventSlug)).limit(1);
      if (event.length === 0) return res.status(404).json({ error: "Event not found" });

      const params = await db.select().from(parametrageTable).where(eq(parametrageTable.evenement_id, event[0].id)).limit(1);
      if (params.length === 0) return res.status(404).json({ error: "Settings not found" });

      if (role === "caisse" && params[0].mdp_caisse === password) valid = true;
      if (role === "preparateur" && params[0].mdp_preparateur === password) valid = true;
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (!valid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      token,
      role,
      event_slug: eventSlug ?? null,
      expires_at: expiresAt,
    });

    // Purge expired sessions in background (fire-and-forget)
    purgeExpiredSessions().catch(() => {});

    res.json({ success: true, role, eventSlug: eventSlug ?? null, token });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token)).catch(() => {});
  }
  res.json({ success: true });
});

router.get("/auth/session", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.json({ authenticated: false, role: null, eventSlug: null });
  const session = await getSession(token);
  if (!session) return res.json({ authenticated: false, role: null, eventSlug: null });
  res.json({ authenticated: true, role: session.role, eventSlug: session.eventSlug });
});

export default router;
