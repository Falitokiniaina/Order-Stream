# Manuel d'utilisation — QuickServe

> Plateforme de gestion de commandes pour stands de buvette et restauration lors d'événements.

---

## Table des matières

1. [Présentation](#présentation)
2. [Installation et démarrage](#installation-et-démarrage)
3. [Initialisation des données (seed)](#initialisation-des-données-seed)
4. [Architecture des rôles](#architecture-des-rôles)
5. [Page Acheteur](#page-acheteur)
6. [Page Caisse](#page-caisse)
7. [Page Préparateur](#page-préparateur)
8. [Page Admin Local (par événement)](#page-admin-local-par-événement)
9. [Page Admin Global](#page-admin-global)
10. [Gestion des articles et des stocks](#gestion-des-articles-et-des-stocks)
11. [Sauvegardes et restauration](#sauvegardes-et-restauration)
12. [Mots de passe et sécurité](#mots-de-passe-et-sécurité)
13. [Paramètres système](#paramètres-système)
14. [Dépannage](#dépannage)

---

## Présentation

**QuickServe** est une application web multi-rôles conçue pour fluidifier le service au comptoir lors d'événements (festivals, galas, soirées, marchés…).

Elle couvre l'intégralité du flux de commande :

```
Acheteur → Réservation → Caisse → Paiement → Préparateur → Livraison
```

### Fonctionnalités principales

- Catalogue d'articles avec gestion de stock en temps réel
- Réservation de panier avec délai d'expiration configurable
- Encaissement multi-modes (CB, espèces, chèque)
- Suivi de la préparation et livraison partielle
- Tableau de bord CA et statistiques
- Gestion multi-événements depuis un seul admin global
- Sauvegardes instantanées de l'état de l'événement
- Favicon personnalisable stockée dans la base de données

---

## Installation et démarrage

### Prérequis

- **Node.js** ≥ 24
- **pnpm** ≥ 10
- **PostgreSQL** ≥ 14

### Variables d'environnement requises

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (ex: `postgresql://user:pass@host:5432/db`) |
| `SESSION_SECRET` | Clé secrète pour les sessions (chaîne aléatoire longue) |

### Étapes d'installation

```bash
# 1. Installer les dépendances
pnpm install

# 2. Appliquer le schéma de base de données
pnpm --filter @workspace/db run push

# 3. Initialiser les données de démonstration
pnpm --filter @workspace/scripts run seed

# 4. Démarrer le serveur API
pnpm --filter @workspace/api-server run dev

# 5. Démarrer le frontend
pnpm --filter @workspace/quickserve run dev
```

### Commandes utiles

```bash
# Vérification des types TypeScript
pnpm run typecheck

# Regénérer les hooks API (après modification de l'OpenAPI spec)
pnpm --filter @workspace/api-spec run codegen

# Pousser les changements de schéma DB (développement)
pnpm --filter @workspace/db run push
```

---

## Initialisation des données (seed)

Le script de seed initialise l'application avec un jeu de données de démonstration complet, **de manière idempotente** (peut être relancé sans dupliquer les données).

```bash
pnpm --filter @workspace/scripts run seed
```

### Ce que le seed crée

| Table | Données |
|---|---|
| `system_settings` | Mot de passe admin global (`admin123`), favicon SVG par défaut |
| `evenements` | Événement *Festival 2026* (slug : `festival-2026`) |
| `parametrage` | Mots de passe caisse/prép/admin-local, 20 min de réservation |
| `articles` | 8 articles : Bière pression, Bière bouteille, Soft/Soda, Eau, Café/Thé, Crêpe sucrée, Hot-dog, Sandwich |

---

## Architecture des rôles

QuickServe distingue **5 rôles**, chacun avec sa propre URL et ses droits :

| Rôle | URL | Mot de passe | Portée |
|---|---|---|---|
| **Acheteur** | `/:slug` | *(aucun)* | Public |
| **Caisse** | `/:slug/caisse` | `mdp_caisse` | Par événement |
| **Préparateur** | `/:slug/preparateur` | `mdp_preparateur` | Par événement |
| **Admin local** | `/:slug/admin` | `mdp_admin_local` | Par événement |
| **Admin global** | `/admin` | `mdp_admin` (système) | Tous les événements |

> `/:slug` désigne le slug URL de l'événement (ex : `/festival-2026`).

---

## Page Acheteur

**URL :** `/:slug` (ex : `/festival-2026`)

Aucun mot de passe requis. L'acheteur :

1. **Saisit son prénom ou nom** pour identifier sa commande.
2. Parcourt le **catalogue d'articles** avec les stocks disponibles en temps réel.
3. Ajoute des articles à son **panier**.
4. **Valide sa réservation** — le stock est immédiatement bloqué pour lui.
5. **Suit le statut** de sa commande en temps réel (polling automatique) :
   - `réservée` → En attente de paiement
   - `payée` → En cours de préparation
   - `livrée` → Commande complète

### Notes importantes

- Le délai de réservation est configurable (par défaut : 20 minutes). Passé ce délai sans paiement, la réservation expire et le stock est libéré.
- Si l'option *Reprendre une commande* est activée, un acheteur peut saisir son nom à nouveau pour retrouver sa commande en cours.
- Les noms de commande sont normalisés en minuscules (insensible à la casse).

---

## Page Caisse

**URL :** `/:slug/caisse`  
**Mot de passe :** `mdp_caisse` (défaut : `caisse123`)

Le caissier voit toutes les **commandes réservées** en attente de paiement.

### Encaisser une commande

1. Cliquer sur une commande pour l'ouvrir.
2. Saisir le **montant encaissé** (CB, espèces ou chèque).
3. Valider — la commande passe en statut `payée` et apparaît chez le préparateur.

### Modes de paiement

| Mode | Champ |
|---|---|
| Carte bancaire | `paye_cb` |
| Espèces | `paye_especes` |
| Chèque | `paye_cheque` |

---

## Page Préparateur

**URL :** `/:slug/preparateur`  
**Mot de passe :** `mdp_preparateur` (défaut : `prep123`)

Le préparateur voit toutes les **commandes payées** à préparer.

### Livrer une commande

- **Livraison totale** : marque tous les articles comme livrés en un clic.
- **Livraison partielle** : coche article par article — utile si certains articles manquent momentanément.

### Historique

Un onglet *Historique* affiche les commandes déjà livrées pour la session en cours.

---

## Page Admin Local (par événement)

**URL :** `/:slug/admin` (ex : `/festival-2026/admin`)  
**Mot de passe :** `mdp_admin_local` (défaut : `admin123`)

L'admin local gère **un seul événement**. Il dispose des onglets :

| Onglet | Fonctionnalités |
|---|---|
| **Tableau de bord** | CA total, CA par mode de paiement, top articles, graphiques |
| **Commandes** | Liste complète des commandes, filtres par statut, recherche par nom |
| **Stock** | Ajouter/modifier/supprimer des articles, ajuster les stocks |
| **Configuration** | Mots de passe (caisse, préparateur, admin local), délai de réservation, ouverture des ventes |
| **Sauvegardes** | Créer, restaurer et supprimer des snapshots |

> Le champ *Mot de passe Admin Global* (`/admin`) n'est **pas accessible** depuis cette page — il ne peut être modifié que depuis `/admin`.

---

## Page Admin Global

**URL :** `/admin`  
**Mot de passe :** `mdp_admin` stocké dans `system_settings` (défaut : `admin123`)

L'admin global gère **tous les événements** depuis une interface unifiée.

### Gestion des événements

- **Créer** un nouvel événement (nom + slug URL unique).
- **Sélectionner** un événement actif via le menu déroulant.
- Accéder à tous les onglets (tableau de bord, commandes, stock, configuration, sauvegardes) pour l'événement sélectionné.

### Configuration spécifique à l'admin global

L'onglet *Configuration* inclut, en plus des réglages par événement, le champ **Mot de passe Admin Global** qui modifie le mot de passe de connexion à `/admin`.

---

## Gestion des articles et des stocks

### Créer un article

Dans l'onglet **Stock** (admin local ou global) :
1. Cliquer sur *Ajouter un article*.
2. Renseigner : nom, description (optionnel), prix, stock initial.
3. Valider.

### Modifier un article

Cliquer sur l'icône de modification d'un article existant pour changer son nom, son prix ou son stock.

### Ajuster le stock

- **Incrémenter / Décrémenter** directement via les boutons `+` / `-` dans la liste.
- Le stock disponible affiché aux acheteurs tient compte des réservations actives et des commandes payées non encore livrées.

### Formule du stock disponible

```
Stock disponible = Stock total
                 − Réservations actives non expirées
                 − Articles non livrés dans commandes payées
```

### Désactiver un article

Un article peut être masqué du catalogue des acheteurs sans être supprimé (bouton de désactivation).

---

## Sauvegardes et restauration

L'onglet **Sauvegardes** permet de prendre des instantanés (*snapshots*) de l'état complet d'un événement.

### Créer une sauvegarde

1. Saisir un libellé descriptif (ex : `Avant ouverture`, `Mi-soirée`).
2. Cliquer sur *Créer une sauvegarde*.

Un snapshot capture : articles, paramétrage, commandes, items, réservations.

### Restaurer une sauvegarde

> ⚠️ **Attention** : La restauration remplace toutes les données actuelles de l'événement par celles du snapshot. Cette action est irréversible.

1. Sélectionner un snapshot dans la liste.
2. Cliquer sur *Restaurer*.
3. Confirmer la boîte de dialogue.

> Note : La restauration est rétrocompatible — les anciens snapshots créés avant l'introduction de `mdp_admin_local` seront restaurés avec la valeur `admin123` pour ce champ.

---

## Mots de passe et sécurité

### Tableau des mots de passe

| Champ | Table | Rôle | Page de connexion |
|---|---|---|---|
| `mdp_admin` | `system_settings` | Admin global | `/admin` |
| `mdp_admin_local` | `parametrage` | Admin local | `/:slug/admin` |
| `mdp_caisse` | `parametrage` | Caisse | `/:slug/caisse` |
| `mdp_preparateur` | `parametrage` | Préparateur | `/:slug/preparateur` |

### Modifier les mots de passe

- **`mdp_admin` (global)** : uniquement depuis `/admin` → onglet *Configuration* → section *Mot de passe Admin Global*.
- **Les autres** : depuis `/admin` ou `/:slug/admin` → onglet *Configuration* → section *Mots de passe*.

### Durée de session

Les sessions durent **8 heures** puis expirent automatiquement. Les sessions expirées sont nettoyées en arrière-plan.

### Notes de sécurité

- Les mots de passe sont stockés en clair dans la base de données (conçu pour des événements internes).
- Les sessions sont stockées dans la table `sessions` avec un token aléatoire.

---

## Paramètres système

Accessibles via l'onglet **Configuration** de l'admin (global ou local) :

| Paramètre | Description | Défaut |
|---|---|---|
| *Ouverture des ventes* | Active/désactive la possibilité pour les acheteurs de passer commande | Activé |
| *Reprendre une commande* | Permet à un acheteur de retrouver sa commande en saisissant son nom | Désactivé |
| *Délai de réservation* | Minutes avant expiration d'une réservation non payée | 20 min |

### Favicon (onglet Configuration — admin global)

La favicon affichée dans les onglets du navigateur est stockée en base de données (`system_settings.favicon_svg`). Elle est servie par l'API à l'adresse `/api/system/favicon.svg`. Il est possible de la remplacer en fournissant un nouveau SVG via l'endpoint `PATCH /api/system/settings`.

---

## Dépannage

### Le serveur API ne démarre pas

- Vérifier que `DATABASE_URL` est défini et valide.
- Vérifier que la base de données est accessible.
- S'assurer d'avoir exécuté `pnpm --filter @workspace/db run push` pour créer les tables.

### Les tables n'existent pas en production

Après chaque modification du schéma Drizzle, appliquer la migration :
```bash
pnpm --filter @workspace/db run push
```

### Le favicon n'apparaît pas

- S'assurer que l'API est démarrée et accessible à `/api/system/favicon.svg`.
- Vérifier que la table `system_settings` contient bien une ligne avec `favicon_svg` renseigné.
- En dernier recours, relancer le seed : `pnpm --filter @workspace/scripts run seed`.

### La page acheteur est bloquée

Vérifier que :
- L'événement existe bien avec le bon slug dans la table `evenements`.
- Le paramètre `vente_ouverte` est activé dans `parametrage`.

### Les types TypeScript ne correspondent plus

Après modification de `lib/api-spec/openapi.yaml` :
```bash
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
```

### Conflit de route Express

La route `orders/summary` doit impérativement être déclarée **avant** `orders/:id` dans le routeur Express pour éviter un conflit de paramètre.

---

## Annexe — Structure des URLs

| URL | Rôle | Description |
|---|---|---|
| `/:slug` | Acheteur | Catalogue et suivi de commande |
| `/:slug/caisse` | Caisse | Encaissement |
| `/:slug/preparateur` | Préparateur | Préparation et livraison |
| `/:slug/admin` | Admin local | Gestion de l'événement |
| `/admin` | Admin global | Gestion multi-événements |

## Annexe — Endpoints API principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authentification |
| `GET` | `/api/events` | Liste des événements |
| `GET` | `/api/events/slug/:slug` | Événement par slug |
| `GET` | `/api/events/:id/settings` | Paramètres d'un événement |
| `PATCH` | `/api/events/:id/settings` | Modifier les paramètres |
| `GET` | `/api/system/settings` | Paramètres système globaux |
| `PATCH` | `/api/system/settings` | Modifier les paramètres système |
| `GET` | `/api/system/favicon.svg` | Favicon SVG (stockée en DB) |
| `GET` | `/api/events/:id/articles` | Articles d'un événement |
| `POST` | `/api/events/:id/orders` | Créer une commande |
| `GET` | `/api/events/:id/dashboard` | Statistiques CA |
| `GET` | `/api/events/:id/snapshots` | Liste des sauvegardes |
| `POST` | `/api/events/:id/snapshots/:sid/restore` | Restaurer une sauvegarde |
