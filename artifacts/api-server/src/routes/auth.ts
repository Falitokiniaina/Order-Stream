import { Router } from "express";
import { db, parametrageTable, evenementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Simple in-memory session store (production would use redis/DB)
const sessions = new Map<string, { role: string; eventSlug: string | null; expiresAt: number }>();

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSession(token: string) {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

router.post("/auth/login", async (req, res) => {
  const { password, role, eventSlug } = req.body as { password: string; role: string; eventSlug?: string };

  if (!password || !role) {
    return res.status(400).json({ error: "Missing password or role" });
  }

  try {
    let valid = false;

    if (role === "admin") {
      // Admin can log in without event slug — check any parametrage or hardcoded
      if (eventSlug) {
        const event = await db.select().from(evenementsTable).where(eq(evenementsTable.slug_url, eventSlug)).limit(1);
        if (event.length > 0) {
          const params = await db.select().from(parametrageTable).where(eq(parametrageTable.evenement_id, event[0].id)).limit(1);
          if (params.length > 0 && params[0].mdp_admin === password) valid = true;
        }
      }
      // Fall back: check if any parametrage has this admin password
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
    const eightHours = 8 * 60 * 60 * 1000;
    sessions.set(token, { role, eventSlug: eventSlug ?? null, expiresAt: Date.now() + eightHours });

    res.json({ success: true, role, eventSlug: eventSlug ?? null, token });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  res.json({ success: true });
});

router.get("/auth/session", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.json({ authenticated: false, role: null, eventSlug: null });
  const session = getSession(token);
  if (!session) return res.json({ authenticated: false, role: null, eventSlug: null });
  res.json({ authenticated: true, role: session.role, eventSlug: session.eventSlug });
});

export default router;
