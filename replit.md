# QuickServe

Plateforme web de gestion de commandes pour stands de buvette/restauration lors d'événements. Gestion multi-rôles : acheteur, caissier, préparateur et administrateur.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/quickserve run dev` — run the frontend (port 20546)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + Wouter + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/db/src/schema/` — DB schema (evenements, parametrage, articles, commandes, commande_items, reservations)
- `artifacts/api-server/src/routes/` — API route handlers (auth, events, articles, orders, settings, dashboard)
- `artifacts/quickserve/src/pages/` — Frontend pages (landing, buyer, caisse, preparateur, admin)

## Architecture decisions

- Passwords stored in plain text in `parametrage` table (as per spec). Admin can change them via UI.
- Reservations use `SELECT FOR UPDATE` transactions via raw pg pool to ensure stock consistency under concurrency.
- Stock disponible = stock_total − réservations actives non expirées − items non livrés dans commandes payées.
- Auth uses token-based sessions stored in server memory + localStorage on client (8h expiry).
- All order names are normalized to lowercase in the DB.

## Product

- **Page Acheteur** (`/:slug`) — Saisie du nom, catalogue avec stocks, réservation panier, polling statut en temps réel.
- **Page Caisse** (`/:slug/caisse`) — Liste des commandes réservées, encaissement CB/espèces/chèque avec validation du total.
- **Page Préparateur** (`/:slug/preparateur`) — Vue des commandes payées, livraison totale ou partielle, historique.
- **Page Admin** (`/admin`) — Gestion multi-événements, tableau de bord CA, gestion stocks/articles, configuration.

## Default credentials

- Caisse: `caisse123`
- Préparateur: `prep123`
- Admin: `admin123`
- Event slug de démo: `festival-2026`

## User preferences

- French language UI
- Warm orange/red color palette
- All order names case-insensitive (normalized to lowercase)

## Gotchas

- After DB schema changes: run `pnpm --filter @workspace/db run push` THEN restart API server.
- After OpenAPI spec changes: run `pnpm --filter @workspace/api-spec run codegen` before touching frontend.
- The `orders/summary` route must come BEFORE `orders/:id` in Express to avoid route conflict.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
