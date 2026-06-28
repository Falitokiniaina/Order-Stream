/**
 * Seed script — initialise les données de démonstration.
 * Idempotent : peut être relancé sans dupliquer les données.
 *
 * Usage : pnpm --filter @workspace/scripts run seed
 */

import {
  db,
  evenementsTable,
  parametrageTable,
  articlesTable,
  systemSettingsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

async function fetchAsDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.warn(`  ⚠ Impossible de télécharger l'image (${url}) : ${err}`);
    return url;
  }
}

const DEFAULT_FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#C53030"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><path d="M20 3 L8 17 H15 L12 29 L24 15 H17 Z" fill="white"/></svg>';

// ── 1. system_settings ───────────────────────────────────────────────────────

async function seedSystemSettings() {
  const existing = await db.select().from(systemSettingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(systemSettingsTable).values({
      mdp_admin: "admin123",
      favicon_svg: DEFAULT_FAVICON_SVG,
    });
    console.log("✓ system_settings créé (mdp_admin=admin123, favicon inclus)");
  } else {
    console.log("· system_settings déjà initialisé");
  }
}

// ── 2. Événement de démonstration ────────────────────────────────────────────

async function seedDemoEvent() {
  const SLUG = "festival-2026";

  const existing = await db
    .select()
    .from(evenementsTable)
    .where(eq(evenementsTable.slug_url, SLUG))
    .limit(1);

  let eventId: number;

  if (existing.length === 0) {
    const [ev] = await db
      .insert(evenementsTable)
      .values({ nom: "Festival 2026", slug_url: SLUG, actif: true })
      .returning();
    eventId = ev.id;
    console.log(`✓ Événement créé : "${ev.nom}" (slug: ${SLUG})`);
  } else {
    eventId = existing[0].id;
    console.log(`· Événement déjà existant : ${SLUG} (id=${eventId})`);
  }

  // ── 2a. Paramétrage ────────────────────────────────────────────────────────

  const existingParams = await db
    .select()
    .from(parametrageTable)
    .where(eq(parametrageTable.evenement_id, eventId))
    .limit(1);

  if (existingParams.length === 0) {
    await db.insert(parametrageTable).values({
      evenement_id: eventId,
      temps_reservation_minutes: 20,
      mdp_caisse: "caisse123",
      mdp_preparateur: "prep123",
      mdp_admin_local: "admin123",
      vente_ouverte: true,
      allow_reprendre_commande: false,
    });
    console.log(
      "✓ Paramétrage créé (caisse=caisse123 / prep=prep123 / admin-local=admin123)"
    );
  } else {
    console.log("· Paramétrage déjà existant");
  }

  // ── 2b. Articles exemples ─────────────────────────────────────────────────

  const existingArticles = await db
    .select({ id: articlesTable.id })
    .from(articlesTable)
    .where(eq(articlesTable.evenement_id, eventId))
    .limit(1);

  if (existingArticles.length === 0) {
    console.log("  → Téléchargement des images demo en binaire (data URI)…");
    const RAW = [
      {
        nom: "Bière pression",
        description: "Pinte blonde 50cl",
        prix: "3.50",
        stock_total: 100,
        display_order: 1,
        src: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=75&fit=crop&crop=center",
      },
      {
        nom: "Bière bouteille",
        description: "33cl — blonde ou ambrée",
        prix: "3.00",
        stock_total: 80,
        display_order: 2,
        src: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=75&fit=crop&crop=center",
      },
      {
        nom: "Soft / Soda",
        description: "Coca, Sprite, Oasis",
        prix: "2.00",
        stock_total: 120,
        display_order: 3,
        src: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=75&fit=crop&crop=center",
      },
      {
        nom: "Eau minérale",
        description: "50cl",
        prix: "1.50",
        stock_total: 150,
        display_order: 4,
        src: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=75&fit=crop&crop=center",
      },
      {
        nom: "Café / Thé",
        description: "Expresso, allongé ou infusion",
        prix: "1.50",
        stock_total: 60,
        display_order: 5,
        src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=75&fit=crop&crop=center",
      },
      {
        nom: "Crêpe sucrée",
        description: "Beurre-sucre, confiture ou Nutella",
        prix: "2.50",
        stock_total: 50,
        display_order: 6,
        src: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&q=75&fit=crop&crop=center",
      },
      {
        nom: "Hot-dog",
        description: "Pain brioché, saucisse grillée, condiments",
        prix: "4.00",
        stock_total: 40,
        display_order: 7,
        src: "https://images.unsplash.com/photo-1615361200141-8640b61c2f37?w=400&q=75&fit=crop&crop=center",
      },
      {
        nom: "Sandwich jambon-beurre",
        description: "Baguette tradition",
        prix: "3.50",
        stock_total: 30,
        display_order: 8,
        src: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=75&fit=crop&crop=center",
      },
    ];

    const articles = await Promise.all(
      RAW.map(async ({ src, ...rest }) => ({
        ...rest,
        image_url: await fetchAsDataUrl(src),
      }))
    );

    await db.insert(articlesTable).values(
      articles.map((a) => ({ ...a, evenement_id: eventId, disponible: true }))
    );
    console.log(`✓ ${articles.length} articles créés avec images binaires`);
  } else {
    console.log("· Articles déjà existants");
  }

  return eventId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Démarrage du seed QuickServe…\n");

  try {
    await seedSystemSettings();
    await seedDemoEvent();

    console.log("\n✅ Seed terminé.");
    console.log("\nAccès de démonstration :");
    console.log("  Événement  : festival-2026");
    console.log("  Admin global : admin123   → /admin");
    console.log("  Admin local  : admin123   → /festival-2026/admin");
    console.log("  Caisse       : caisse123  → /festival-2026/caisse");
    console.log("  Préparateur  : prep123    → /festival-2026/preparateur");
    console.log("  Acheteur     :            → /festival-2026\n");
  } catch (err) {
    console.error("❌ Erreur seed :", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
