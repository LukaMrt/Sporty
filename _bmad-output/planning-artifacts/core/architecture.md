---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-14'
inputDocuments:
  - prd.md
  - product-brief-Sporty-2026-02-13.md
  - ux-design-specification.md
  - brainstorming-session-2026-02-13.md
workflowType: 'architecture'
project_name: 'Sporty'
user_name: 'Luka'
date: '2026-02-14'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (27 FRs en 6 catégories) :**

| Catégorie                               | FRs | Implications architecturales                                                                          |
| --------------------------------------- | --- | ----------------------------------------------------------------------------------------------------- |
| Gestion des comptes & Auth (FR1-FR6)    | 6   | Auth sessions AdonisJS + guards, middleware d'autorisation, rôle admin auto-assigné au premier compte |
| Profil utilisateur (FR7-FR9)            | 3   | Modèle profil sportif extensible, stockage préférences d'affichage par utilisateur                    |
| Gestion des séances (FR10-FR17)         | 8   | CRUD avec soft-delete, modèle socle commun + métriques spécifiques par sport, filtrage/tri            |
| Visualisation & Progression (FR18-FR21) | 4   | Agrégation de données temporelles, graphiques frontend, conversion d'unités à l'affichage             |
| Gestion des sports (FR22-FR24)          | 3   | Architecture extensible multi-sport : socle commun partagé + extensions par sport                     |
| Administration serveur (FR25-FR27)      | 3   | Déploiement Docker, gestion utilisateurs CRUD admin                                                   |

**Non-Functional Requirements :**

| Catégorie      | Exigences clés                                                                             | Impact architectural                                 |
| -------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Performance    | < 2s actions courantes, fluide jusqu'à ~500 séances, compatible serveur modeste            | Optimisation requêtes, pagination, indexation DB     |
| Sécurité       | HTTPS, sessions sécurisées, hash mots de passe (argon2), sanitisation inputs, headers HTTP | Middleware sécurité, CSRF intégré, validation inputs |
| Maintenabilité | Docker compose unique, volumes persistants, migrations DB                                  | Schema versioning, docker-compose bien structuré     |

### Scale & Complexity

- **Domaine principal :** Full-stack web (AdonisJS + Inertia + React)
- **Niveau de complexité :** Basse à moyenne
- **Composants architecturaux estimés :** ~8-10 (auth, users, sports, sessions, dashboard/analytics, profil, admin, charting)

### Architectural Style : Routes Intentionnelles + Clean Architecture

**Décision utilisateur :** Routes sémantiques orientées intention plutôt que CRUD générique, combinées avec les principes Clean Architecture / DDD.

**Routes intentionnelles :**

- Les routes expriment des **intentions métier** claires plutôt que des opérations CRUD génériques
- Exemples : `POST /sessions/log`, `POST /sessions/:id/restore`, `GET /dashboard/progress`
- Pas de framework CQRS lourd (pas de command bus, event bus, etc.) — juste du nommage sémantique

**Clean Architecture — Principe directeur :**

- **Controllers** = adaptateurs minces. Zéro logique métier. Ils reçoivent la requête, appellent un use case, retournent la réponse (Inertia ou JSON)
- **Use Cases / Services** = la logique métier. Indépendants du transport (HTTP, CLI, queue). Un use case = une intention (LogSession, RestoreSession, GetDashboardProgress)
- **Domain** = entités, value objects, règles métier pures. Aucune dépendance framework
- **Infrastructure** = repositories (Lucid/DB), providers externes (Strava API futur)

**Pourquoi cette discipline dès le MVP :**

- Permet d'ajouter des routes API (`/api/*`) plus tard en branchant un nouveau controller sur le même use case — zéro duplication
- Facilite les tests unitaires (tester le use case sans HTTP)
- Prépare l'extensibilité multi-sport (chaque sport peut injecter ses propres règles dans le domain)

### Technical Constraints & Dependencies

- **Déploiement :** Docker Compose obligatoire, fichier .env pour configuration
- **Base de données :** Volume Docker persistant, support des migrations
- **API :** Routes intentionnelles + Clean Architecture. Inertia pour le frontend, API JSON ouvrable via routes `/api/*`
- **Frontend :** SPA client-side rendering, design system headless + Tailwind CSS
- **Pas de SSR** nécessaire (app derrière auth)
- **Pas de temps réel** — refresh classique
- **Serveur cible :** VPS entrée de gamme ou Raspberry Pi-class
- **Développeur unique** — stack choisie pour productivité maximale

### Cross-Cutting Concerns

1. **Extensibilité multi-sport** — Traverse le modèle de données, la saisie, l'affichage et l'analyse. Chaque sport définit ses métriques spécifiques tout en partageant un socle commun. Architecture plugin/modulaire recommandée
2. **Authentification & Autorisation** — Sessions + guards pour Inertia, Access Tokens prévus pour API future, distinction admin/utilisateur, premier inscrit = admin
3. **Conversion d'unités** — Stockage normalisé en interne, affichage adapté aux préférences utilisateur (km/h vs min/km)
4. **Soft-delete pattern** — Séances supprimées logiquement, visualisables et restaurables
5. **Migrations de schéma** — Évolutions de la DB entre versions, compatibilité ascendante
6. **Responsive / Adaptive UI** — Même app, expériences différentes mobile vs desktop (bottom sheet vs modale, tab bar vs sidebar)
7. **Validation métier dans les use cases** — Chaque use case valide ses données métier avant exécution (métriques obligatoires par sport, permissions utilisateur)

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web (AdonisJS + Inertia + React) basé sur l'analyse des exigences projet.

### Technical Preferences

- **Langage :** TypeScript (full-stack)
- **Backend :** AdonisJS v6 (stable) — framework Node.js batteries-included, philosophie Laravel/Symfony
- **Frontend :** React via Inertia.js (intégré dans AdonisJS)
- **Base de données :** PostgreSQL — configurable par variable d'environnement pour modularité
- **Gestionnaire de paquets :** pnpm — standard industriel pour les monorepos, dépendances strictes, économe en espace disque
- **Monorepo :** Non nécessaire au sens classique — AdonisJS Inertia intègre le frontend dans le projet. Le monorepo pnpm pourra servir si des packages partagés émergent plus tard
- **Containerisation :** Docker Compose

### Starter Options Considered

| Option                                   | Description                                                         | Verdict                                             |
| ---------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| **AdonisJS Inertia Starter Kit (React)** | Kit officiel AdonisJS avec Inertia, React, auth intégrée, Lucid ORM | ✅ Retenu                                           |
| **AdonisJS API Starter Kit**             | Backend API pur, sans frontend                                      | ❌ Trop découplé pour le MVP, perte de productivité |
| **AdonisJS Web Starter Kit**             | Templates serveur (Edge), pas de React                              | ❌ Ne correspond pas au choix React                 |
| **AdonisJS Slim Starter Kit**            | Minimal, sans auth ni ORM                                           | ❌ Trop nu, il faudrait tout reconfigurer           |

### Selected Starter: AdonisJS Inertia Starter Kit (React)

**Rationale :**

- Kit officiel et maintenu par l'équipe AdonisJS
- Auth (sessions, guards) intégrée nativement — pas de JWT à configurer pour le frontend
- Lucid ORM inclus avec support migrations PostgreSQL
- Vite configuré pour le bundling React
- Structure projet cohérente et conventionnelle
- API ouvrable à tout moment via routes `/api/*` supplémentaires

**Commande d'initialisation :**

```bash
pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr
```

**Décisions architecturales fournies par le starter :**

| Aspect                 | Décision du starter                        |
| ---------------------- | ------------------------------------------ |
| **Language & Runtime** | TypeScript strict, Node.js, ESM            |
| **Styling**            | Non inclus — à ajouter (Tailwind CSS)      |
| **Build Tooling**      | Vite (frontend), tsc (backend)             |
| **Testing**            | Japa (framework de test AdonisJS)          |
| **ORM**                | Lucid (Active Record, migrations, seeders) |
| **Auth**               | Sessions + guards intégrés                 |
| **Routing**            | Fichier `start/routes.ts`, type-safe       |
| **Validation**         | VineJS intégré                             |
| **Frontend**           | React via Inertia.js, pas de SSR           |

**Décisions restant à prendre (étapes suivantes) :**

- Structure Clean Architecture (organisation des dossiers domain/use-cases/infra)
- Configuration Tailwind CSS + design system headless
- Configuration PostgreSQL via variables d'environnement
- Configuration Docker Compose
- Librairie de graphiques frontend

**Note :** L'initialisation du projet via cette commande sera la première story d'implémentation. La structure Clean Architecture sera mise en place par-dessus la structure conventionnelle AdonisJS.

## Core Architectural Decisions

### Decision Priority Analysis

**Décisions Critiques (bloquent l'implémentation) :**

| Décision                | Choix                                                                | Rationale                                                                                           |
| ----------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Backend framework       | AdonisJS v6 (Inertia + React)                                        | Batteries-included, productif pour dev solo, familier depuis Symfony                                |
| Base de données         | PostgreSQL (configurable par env)                                    | Robuste, JSONB natif, migrations Lucid                                                              |
| Modèle multi-sport      | Socle commun + colonne JSONB `sport_metrics`                         | Flexible, pas de migration par sport, validation dans le domain                                     |
| Architecture logicielle | Clean Architecture (controllers minces → use cases → domain → infra) | Découplage vue/métier, API ouvrable sans refactoring                                                |
| Auth frontend           | Sessions + guards AdonisJS                                           | Natif, CSRF intégré, pas de JWT pour Inertia                                                        |
| Premier admin           | Logique applicative (premier inscrit = admin)                        | Zéro friction au déploiement                                                                        |
| Design system           | Shadcn/ui (Radix + Tailwind CSS)                                     | Composants owned, customisables, couvrent tous les besoins UX                                       |
| Graphiques              | Recharts                                                             | API React-native, composable, adapté aux sparklines et courbes                                      |
| CI/CD                   | GitHub Actions (lint, format, build, Docker push sur Docker Hub)     | Pipeline minimaliste dès le MVP, évolutive                                                          |
| Qualité de code         | Warnings as errors sur tous les outils                               | Tolérance zéro dès le départ : ESLint `--max-warnings 0`, TypeScript strict, Vite warnings = errors |
| Package manager         | pnpm                                                                 | Standard monorepo, dépendances strictes                                                             |

**Décisions Importantes (façonnent l'architecture) :**

| Décision          | Choix                                                    | Rationale                                              |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Rôles utilisateur | Champ `role` sur User (`admin` \| `user`)                | Simple, deux rôles suffisent                           |
| State management  | State local React + props Inertia                        | Pas de store global, données serveur-driven            |
| Logging           | Pino (intégré AdonisJS)                                  | Performant, suffisant au MVP via `docker compose logs` |
| Docker            | 2 containers (app + db)                                  | Simple, un seul build pour AdonisJS+React              |
| Déploiement       | Image Docker Hub → pull homelab → reverse proxy existant | Workflow simple : CI build + push, homelab pull + up   |

**Décisions Différées (post-MVP) :**

| Décision             | Raison du report                                                              |
| -------------------- | ----------------------------------------------------------------------------- |
| Auth API (tokens)    | Pas de routes `/api/*` au MVP. Access Tokens AdonisJS prévus quand nécessaire |
| PWA / Service Worker | Non prioritaire, UX spec le mentionne comme "à considérer"                    |
| Dark mode            | Tokens prévus dans le design system, implémentation post-MVP                  |
| Monitoring avancé    | Logs suffisants au MVP, stack monitoring si besoin plus tard                  |

### Data Architecture

**Base de données : PostgreSQL**

- Configurable intégralement par variables d'environnement (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`)
- Volume Docker persistant pour les données
- Migrations Lucid pour le versioning du schéma

**Modèle de données multi-sport :**

- Table `sessions` avec socle commun : `id`, `user_id`, `sport_type`, `date`, `duration_minutes`, `distance_km`, `avg_heart_rate`, `perceived_effort`
- Colonne `sport_metrics` de type JSONB pour les métriques spécifiques au sport (ex: `{ "pace_per_km": "5:12", "cadence": 180 }` pour la course)
- Validation des métriques spécifiques dans la couche domain (use case), pas en base
- Index GIN sur `sport_metrics` si nécessaire pour les requêtes d'agrégation

**Soft-delete :**

- Colonne `deleted_at` (nullable timestamp) sur la table `sessions`
- Scopes Lucid pour filtrer automatiquement les séances supprimées
- Route intentionnelle `POST /sessions/:id/restore` pour la restauration

### Authentication & Security

**Auth Frontend (Inertia) :**

- Sessions cookie-based via AdonisJS guards
- CSRF protection intégrée
- Hash mots de passe : argon2 (défaut AdonisJS)
- Middleware `auth` sur toutes les routes protégées

**Auth API (différé post-MVP) :**

- Access Tokens AdonisJS (opaque tokens, révocables, stockés en base)
- Sera activé quand les routes `/api/*` seront nécessaires

**Autorisation :**

- Champ `role` sur le modèle User : `admin` | `user`
- Premier utilisateur inscrit → rôle `admin` automatiquement (logique dans le use case RegisterUser)
- Middleware ou guard custom pour les routes admin

### API & Communication Patterns

**Routes intentionnelles :**

- Nommage sémantique orienté intention métier
- Exemples :
  - `POST /sessions/log` — saisir une séance
  - `POST /sessions/:id/restore` — restaurer une séance supprimée
  - `GET /dashboard/progress` — données de progression du dashboard
  - `GET /sessions/history` — historique des séances avec filtres

**Cohabitation Inertia + API :**

- Routes Inertia : controllers retournent `inertia.render('Page', { props })`
- Routes API (`/api/*`) : controllers retournent `response.json(data)` — même use cases, adaptateur différent
- Logique métier dans les services/use cases, jamais dans les controllers

**Gestion d'erreurs :**

- Validation des inputs via VineJS (retourne des erreurs structurées)
- Erreurs métier dans les use cases (exceptions domain typées)
- Controllers traduisent les erreurs domain en réponses HTTP appropriées

### Frontend Architecture

**React via Inertia.js :**

- Navigation SPA sans rechargement (requêtes XHR, swap de composants React)
- Routing côté serveur (AdonisJS), rendu côté client (React)
- Props typées entre backend et frontend

**Design System : Shadcn/ui + Tailwind CSS**

- Composants headless (Radix UI) copiés dans le projet, customisés librement
- Tailwind CSS pour le styling utilitaire, mobile-first
- Tokens de design (couleurs, typo, espacements) définis comme variables Tailwind
- Composants identifiés dans le UX spec : Dialog, Sheet, Toast, Tabs, Form, Toggle, Skeleton, etc.

**Graphiques : Recharts**

- Sparklines pour le HeroMetric et QuickStatCards
- Courbes d'évolution pour le dashboard détaillé
- Zoom temporel (semaine/mois) via filtrage des données

**State Management :**

- Props Inertia pour les données serveur (passées à chaque navigation)
- `useState` / `useReducer` React pour le state local (formulaires, UI)
- Pas de store global (Redux, Zustand) — non nécessaire avec Inertia

### Infrastructure & Deployment

**Docker Compose (2 services) :**

```yaml
services:
  app: # AdonisJS + React (Vite build intégré)
  db: # PostgreSQL
```

**Variables d'environnement :**

- Configuration complète de PostgreSQL via env
- Secret de session, port applicatif, etc. via `.env`
- `.env.example` versionné, `.env` dans `.gitignore`

**CI/CD — GitHub Actions :**

- **Lint** : ESLint avec `--max-warnings 0` (warnings = errors)
- **Format** : Prettier check
- **TypeScript** : Compilation stricte, aucun warning toléré
- **Build** : Vite build frontend + tsc backend (warnings = errors)
- **Docker** : Build image + push sur Docker Hub
- Déclenchement : push sur `main` et pull requests

**Déploiement homelab :**

- Pull de l'image Docker Hub
- `docker-compose.yml` minimal avec env + volume PostgreSQL
- Reverse proxy existant en amont (HTTPS terminé au proxy)

### Decision Impact Analysis

**Séquence d'implémentation recommandée :**

1. Initialisation projet (starter AdonisJS + pnpm + Tailwind + Shadcn)
2. Structure Clean Architecture (dossiers domain/use-cases/infra)
3. Configuration Docker Compose + PostgreSQL
4. Pipeline GitHub Actions
5. Modèle de données (User, Session, sport_metrics JSONB)
6. Auth + premier admin auto
7. Use cases et controllers (routes intentionnelles)
8. Frontend React (composants, pages, design system)

**Dépendances inter-décisions :**

- Clean Architecture → impacte l'organisation de tout le code backend
- JSONB sport_metrics → impacte la validation domain et l'affichage frontend
- Shadcn/ui → nécessite Tailwind CSS configuré au préalable
- GitHub Actions → nécessite Dockerfile fonctionnel
- Warnings as errors → doit être configuré dès l'initialisation pour éviter la dette

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Base de données (conventions Lucid/PostgreSQL) :**

- Tables : `snake_case`, pluriel → `users`, `sessions`, `sports`
- Colonnes : `snake_case` → `user_id`, `sport_type`, `avg_heart_rate`, `deleted_at`
- Clés étrangères : `<table_singulier>_id` → `user_id`, `session_id`
- Index : `idx_<table>_<colonnes>` → `idx_sessions_user_id`, `idx_sessions_sport_type`

**Routes (intentionnelles) :**

- Noms de ressources : pluriel, kebab-case → `/sessions`, `/dashboard/progress`
- Actions intentionnelles : verbe/intention → `POST /sessions/log`, `POST /sessions/:id/restore`
- Paramètres d'URL : `:id`, `:sessionId` (camelCase)
- Query params : camelCase → `?sportType=running&startDate=2026-01-01`

**Code TypeScript :**

- Fichiers backend : `snake_case.ts` (convention AdonisJS) → `sessions_controller.ts`, `log_session.ts`
- Fichiers React : `PascalCase.tsx` pour les composants → `Dashboard.tsx`, `SessionForm.tsx`
- Classes : `PascalCase` → `SessionsController`, `LogSession`, `User`
- Fonctions/méthodes : `camelCase` → `getProgress()`, `logSession()`
- Variables : `camelCase` → `sportType`, `avgHeartRate`
- Constantes : `UPPER_SNAKE_CASE` → `MAX_SESSIONS_PER_PAGE`, `DEFAULT_SPORT`
- Types/Interfaces : `PascalCase` → `SessionData`, `SportMetrics`, `DashboardProgress`

### Structure Patterns

**Backend — Clean Architecture par feature :**

```
app/
├── controllers/          # Adaptateurs HTTP (minces)
│   ├── sessions_controller.ts
│   └── dashboard_controller.ts
├── domain/               # Entités, value objects, règles métier
│   ├── entities/
│   ├── value_objects/
│   └── errors/
├── use_cases/            # Logique métier (1 fichier = 1 intention)
│   ├── log_session.ts
│   ├── restore_session.ts
│   └── get_dashboard_progress.ts
├── repositories/         # Interfaces + implémentations Lucid
│   ├── interfaces/
│   └── lucid/
├── models/               # Modèles Lucid (ORM)
├── middleware/            # Auth, admin guard
└── validators/           # Schémas VineJS
```

**Frontend — Organisation par feature :**

```
inertia/
├── components/           # Composants réutilisables
│   ├── ui/               # Shadcn/ui (Button, Dialog, Sheet...)
│   └── shared/           # Composants métier partagés
├── pages/                # Pages Inertia (1 fichier = 1 route)
│   ├── Dashboard.tsx
│   ├── Sessions/
│   │   ├── Index.tsx
│   │   └── Show.tsx
│   └── Auth/
├── layouts/              # Layouts (MainLayout, AuthLayout)
├── hooks/                # Custom React hooks
└── lib/                  # Utilitaires (formatters, unit conversion)
```

**Tests — Dossier racine, organisé en miroir :**

```
tests/
├── unit/
│   ├── use_cases/
│   └── domain/
├── functional/           # Tests HTTP (controllers)
└── e2e/                  # Tests end-to-end (si ajoutés plus tard)
```

### Format Patterns

**Réponses API (futures routes `/api/*`) :**

- Succès : `{ "data": { ... } }`
- Erreur : `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`
- Liste paginée : `{ "data": [...], "meta": { "total": 42, "page": 1, "perPage": 20 } }`

**Props Inertia (frontend) :**

- Données passées directement en props, pas de wrapper — Inertia gère les erreurs nativement
- Nommage camelCase : `{ sessions, dashboardMetrics, currentUser }`

**Formats de données :**

- Dates JSON : ISO 8601 → `"2026-02-14T10:30:00Z"`
- Dates affichées : formatées côté frontend selon la locale utilisateur
- JSON fields : camelCase dans les réponses API et props Inertia
- Booleans : `true`/`false` (jamais `1`/`0`)
- Null : explicitement `null`, jamais omis silencieusement

### Process Patterns

**Gestion d'erreurs :**

- Domain errors : classes typées dans `app/domain/errors/` → `SessionNotFoundError`, `InvalidSportMetricsError`
- Use cases : lèvent des domain errors, jamais des erreurs HTTP
- Controllers : attrapent les domain errors, les traduisent en réponses HTTP (400, 404, 403...)
- Frontend : Inertia gère les erreurs de validation nativement, erreurs serveur → toast non intrusif

**Loading states :**

- Hook `useForm()` d'Inertia pour `processing` automatique sur les formulaires
- `router.on('start')` / `router.on('finish')` pour les navigations
- Skeletons Shadcn pour les chargements de données dans les cartes

**Validation :**

- Côté serveur uniquement (VineJS) = source de vérité
- Le frontend peut ajouter de la validation UX mais le serveur re-valide toujours
- Métriques sport-spécifiques validées dans le use case (pas dans le validator HTTP)

### Enforcement Rules

**Tout agent AI DOIT :**

1. Suivre les conventions de nommage ci-dessus — aucune exception
2. Placer la logique métier dans les use cases, **jamais** dans les controllers
3. Traiter les warnings comme des erreurs (`--max-warnings 0`)
4. Utiliser les domain errors typées, pas de `throw new Error("message")` générique
5. Écrire les props Inertia en camelCase, les colonnes DB en snake_case
6. Respecter l'organisation par feature (pas par type technique)

**Anti-patterns interdits :**

- Controller qui accède directement à Lucid/DB (doit passer par un repository)
- Logique métier dans un composant React (doit vivre côté serveur dans un use case)
- Import circulaire entre domain et infrastructure
- Validation des métriques sport-spécifiques en base de données (doit être dans le domain)
- Fichier fourre-tout `utils.ts` ou `helpers.ts` (nommer précisément par responsabilité)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
sporty/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Pipeline GitHub Actions
├── app/
│   ├── controllers/                  # Adaptateurs HTTP — minces
│   │   ├── auth/
│   │   │   ├── login_controller.ts
│   │   │   ├── logout_controller.ts
│   │   │   └── register_controller.ts
│   │   ├── sessions/
│   │   │   ├── log_session_controller.ts
│   │   │   ├── list_sessions_controller.ts
│   │   │   ├── show_session_controller.ts
│   │   │   ├── update_session_controller.ts
│   │   │   ├── delete_session_controller.ts
│   │   │   └── restore_session_controller.ts
│   │   ├── dashboard/
│   │   │   └── dashboard_controller.ts
│   │   ├── profile/
│   │   │   └── profile_controller.ts
│   │   └── admin/
│   │       └── users_controller.ts
│   ├── domain/                       # Coeur métier — AUCUNE dépendance framework
│   │   ├── entities/
│   │   │   ├── user.ts
│   │   │   ├── session.ts
│   │   │   └── sport.ts
│   │   ├── value_objects/
│   │   │   ├── sport_metrics.ts      # Validation des métriques par sport
│   │   │   ├── perceived_effort.ts
│   │   │   └── pace.ts
│   │   ├── errors/
│   │   │   ├── session_not_found_error.ts
│   │   │   ├── invalid_sport_metrics_error.ts
│   │   │   ├── unauthorized_error.ts
│   │   │   └── user_already_exists_error.ts
│   │   └── interfaces/               # Contrats des repositories (ports)
│   │       ├── session_repository.ts
│   │       ├── user_repository.ts
│   │       └── sport_registry.ts
│   ├── use_cases/                    # 1 fichier = 1 intention métier
│   │   ├── auth/
│   │   │   ├── register_user.ts      # Premier inscrit = admin
│   │   │   ├── login_user.ts
│   │   │   └── logout_user.ts
│   │   ├── sessions/
│   │   │   ├── log_session.ts
│   │   │   ├── list_sessions.ts
│   │   │   ├── get_session.ts
│   │   │   ├── update_session.ts
│   │   │   ├── delete_session.ts
│   │   │   └── restore_session.ts
│   │   ├── dashboard/
│   │   │   └── get_dashboard_progress.ts
│   │   ├── profile/
│   │   │   ├── get_profile.ts
│   │   │   └── update_profile.ts
│   │   └── admin/
│   │       ├── list_users.ts
│   │       ├── create_user.ts
│   │       ├── update_user.ts
│   │       └── delete_user.ts
│   ├── repositories/                 # Implémentations Lucid (adaptateurs)
│   │   ├── lucid_session_repository.ts
│   │   └── lucid_user_repository.ts
│   ├── models/                       # Modèles Lucid (ORM)
│   │   ├── user.ts
│   │   └── session.ts
│   ├── middleware/
│   │   ├── auth_middleware.ts
│   │   └── admin_middleware.ts
│   └── validators/                   # Schémas VineJS (validation HTTP)
│       ├── auth/
│       │   ├── register_validator.ts
│       │   └── login_validator.ts
│       ├── sessions/
│       │   ├── log_session_validator.ts
│       │   └── update_session_validator.ts
│       └── profile/
│           └── update_profile_validator.ts
├── config/                           # Configuration AdonisJS
│   ├── app.ts
│   ├── auth.ts
│   ├── database.ts                   # PostgreSQL via variables d'env
│   ├── hash.ts
│   ├── inertia.ts
│   └── shield.ts                     # CSRF, headers sécurité
├── database/
│   ├── migrations/
│   │   ├── xxxx_create_users_table.ts
│   │   ├── xxxx_create_sessions_table.ts
│   │   └── xxxx_create_sports_table.ts
│   └── seeders/
│       └── sport_seeder.ts           # Sports disponibles
├── inertia/                          # Frontend React
│   ├── app/
│   │   └── app.tsx                   # Point d'entrée Inertia
│   ├── components/
│   │   ├── ui/                       # Shadcn/ui
│   │   │   ├── Button.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Sheet.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Form.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Avatar.tsx
│   │   └── shared/                   # Composants métier réutilisables
│   │       ├── HeroMetric.tsx
│   │       ├── QuickStatCard.tsx
│   │       ├── TimelineItem.tsx
│   │       ├── TimelineDivider.tsx
│   │       ├── SparklineChart.tsx
│   │       ├── SessionForm.tsx
│   │       ├── SessionDetail.tsx
│   │       ├── EmptyState.tsx
│   │       └── FAB.tsx
│   ├── pages/
│   │   ├── Auth/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── Onboarding/
│   │   │   └── Wizard.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Sessions/
│   │   │   ├── Index.tsx
│   │   │   └── Show.tsx
│   │   ├── Profile/
│   │   │   └── Edit.tsx
│   │   └── Admin/
│   │       └── Users.tsx
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── hooks/
│   │   └── use_unit_conversion.ts
│   └── lib/
│       ├── formatters.ts
│       └── sport_config.ts
├── start/
│   ├── routes.ts                     # Routes intentionnelles
│   ├── kernel.ts
│   └── env.ts                        # Validation variables d'env
├── tests/
│   ├── unit/
│   │   ├── use_cases/
│   │   │   ├── log_session.spec.ts
│   │   │   ├── register_user.spec.ts
│   │   │   └── get_dashboard_progress.spec.ts
│   │   └── domain/
│   │       ├── sport_metrics.spec.ts
│   │       └── perceived_effort.spec.ts
│   └── functional/
│       ├── auth/
│       │   ├── register.spec.ts
│       │   └── login.spec.ts
│       └── sessions/
│           ├── log_session.spec.ts
│           └── list_sessions.spec.ts
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── Dockerfile                        # Multi-stage build
├── docker-compose.yml                # Dev local : app + PostgreSQL
├── docker-compose.prod.yml           # Prod/homelab
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### Architectural Boundaries

**Flux de données (requête utilisateur) :**

```
Browser → Inertia Request
  → Route (start/routes.ts)
    → Middleware (auth, admin)
      → Controller (adaptateur mince)
        → Validator (VineJS — validation HTTP)
          → Use Case (logique métier)
            → Domain (entités, value objects, validation métier)
            → Repository Interface (port)
              → Lucid Repository (adaptateur DB)
                → PostgreSQL
          ← Résultat
        ← inertia.render() ou response.json()
      ← Inertia Response
    ← React met à jour le composant page
```

**Règle de dépendance (Clean Architecture) :**

```
Controllers → Use Cases → Domain ← Repositories (interfaces)
                                        ↑
                              Lucid Repositories (implémentation)
```

- Le domain ne dépend de rien (ni AdonisJS, ni Lucid, ni HTTP)
- Les use cases dépendent du domain et des interfaces de repositories
- Les controllers dépendent des use cases et des validators
- Les repositories Lucid implémentent les interfaces du domain

**Frontières frontend/backend :**

- Le frontend ne contient aucune logique métier — uniquement affichage et mise en forme
- Les transformations de données (conversion d'unités, formatage) vivent dans `inertia/lib/`
- Les composants shared sont des composants de présentation avec props typées

### Requirements to Structure Mapping

| Catégorie FR          | Controllers              | Use Cases                             | Pages React              |
| --------------------- | ------------------------ | ------------------------------------- | ------------------------ |
| Auth (FR1-FR6)        | `controllers/auth/`      | `use_cases/auth/`                     | `pages/Auth/`            |
| Profil (FR7-FR9)      | `controllers/profile/`   | `use_cases/profile/`                  | `pages/Profile/`         |
| Séances (FR10-FR17)   | `controllers/sessions/`  | `use_cases/sessions/`                 | `pages/Sessions/`        |
| Dashboard (FR18-FR21) | `controllers/dashboard/` | `use_cases/dashboard/`                | `pages/Dashboard.tsx`    |
| Sports (FR22-FR24)    | intégré dans sessions    | `domain/interfaces/sport_registry.ts` | intégré dans formulaires |
| Admin (FR25-FR27)     | `controllers/admin/`     | `use_cases/admin/`                    | `pages/Admin/`           |

| Concern transversal       | Localisation                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Extensibilité multi-sport | `domain/interfaces/sport_registry.ts` + `domain/value_objects/sport_metrics.ts`                   |
| Auth & Autorisation       | `middleware/` + `use_cases/auth/`                                                                 |
| Conversion d'unités       | `inertia/hooks/use_unit_conversion.ts` + `inertia/lib/formatters.ts`                              |
| Soft-delete               | `models/session.ts` (scope Lucid) + `use_cases/sessions/delete_session.ts` & `restore_session.ts` |
| Validation                | `validators/` (HTTP) + `domain/value_objects/` (métier)                                           |

### Development Workflow

**Dev local :**

- `docker compose up db` — lance PostgreSQL
- `node ace serve --hmr` — lance AdonisJS + Vite avec hot reload
- `node ace migration:run` — applique les migrations
- `node ace test` — lance les tests Japa

**Build & déploiement :**

- `Dockerfile` multi-stage : install deps → build (tsc + vite) → image runtime minimale
- CI push sur Docker Hub automatiquement
- Homelab : `docker compose -f docker-compose.prod.yml pull && up -d`

## Architecture Validation Results

### Coherence Validation ✅

**Compatibilité des décisions :**

- AdonisJS v6 + Inertia + React + Lucid + VineJS : stack officielle, maintenue par la même équipe
- Shadcn/ui (Radix + Tailwind) compatible React + Vite nativement
- Recharts compatible React sans conflit
- PostgreSQL + Lucid ORM : support natif, migrations intégrées
- pnpm compatible AdonisJS CLI

**Cohérence des patterns :**

- Clean Architecture alignée avec la structure de dossiers
- Conventions de nommage cohérentes : snake_case backend, PascalCase composants React, camelCase props
- Routes intentionnelles cohérentes avec les use cases (1 intention = 1 use case = 1 route)

**Alignement de la structure :**

- Structure projet reflète fidèlement les décisions architecturales
- Frontières Clean Architecture explicites dans l'arborescence
- Mapping FR → dossiers complet

### Requirements Coverage ✅

**27/27 Exigences Fonctionnelles couvertes :**

| FR                                   | Support architectural                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| FR1 (premier = admin)                | `use_cases/auth/register_user.ts`                                             |
| FR2-3 (CRUD users admin)             | `use_cases/admin/` + `middleware/admin_middleware.ts`                         |
| FR4-6 (login, logout, mdp)           | `use_cases/auth/` + sessions AdonisJS                                         |
| FR7-9 (profil + préférences)         | `use_cases/profile/` + modèle User                                            |
| FR10-11 (saisie + métriques sport)   | `use_cases/sessions/log_session.ts` + `domain/value_objects/sport_metrics.ts` |
| FR12-13 (liste + modification)       | `use_cases/sessions/list_sessions.ts` + `update_session.ts`                   |
| FR14-16 (soft-delete + restauration) | `delete_session.ts` + `restore_session.ts` + scope Lucid `deleted_at`         |
| FR17 (filtrage/tri)                  | `list_sessions.ts` + query params                                             |
| FR18-20 (dashboard + graphiques)     | `use_cases/dashboard/` + Recharts + HeroMetric/QuickStatCard                  |
| FR21 (unités configurables)          | `inertia/hooks/use_unit_conversion.ts` + préférences profil                   |
| FR22-24 (multi-sport extensible)     | `domain/interfaces/sport_registry.ts` + JSONB `sport_metrics`                 |
| FR25-27 (Docker + admin)             | Docker Compose + `use_cases/admin/`                                           |

**Non-Functional Requirements :**

- Performance < 2s : AdonisJS performant, PostgreSQL indexé, SPA Inertia ✅
- ~500 séances : pagination, index DB, Recharts léger ✅
- Serveur modeste : Node.js léger, 2 containers ✅
- Sécurité : argon2, sessions, CSRF, VineJS, shield headers ✅
- Maintenabilité : Docker Compose, migrations Lucid, CI/CD ✅

### Implementation Readiness ✅

**Décisions :** 11 critiques + 5 importantes documentées avec rationale
**Structure :** Arborescence complète, tous fichiers clés identifiés
**Patterns :** Nommage, formats, process, enforcement rules définis
**Anti-patterns :** Explicitement listés et interdits

### Gap Analysis

**Gaps critiques :** Aucun ✅

**Gaps importants (non bloquants) :**

1. Versions exactes des dépendances — figées à l'initialisation du projet
2. Configuration ESLint/Prettier exacte — principe acté, détails à l'implémentation
3. Dockerfile multi-stage détaillé — stratégie définie, contenu à l'implémentation

**Gaps nice-to-have (post-MVP) :**

- Tests E2E (framework à choisir si besoin)
- Health check endpoint
- Documentation API (OpenAPI si routes API ouvertes)

### Architecture Completeness Checklist

**✅ Analyse des exigences**

- [x] Contexte projet analysé en profondeur
- [x] Complexité évaluée (basse à moyenne)
- [x] Contraintes techniques identifiées
- [x] Concerns transversaux cartographiés (7)

**✅ Décisions architecturales**

- [x] Décisions critiques documentées avec rationale
- [x] Stack technologique complète
- [x] Patterns d'intégration définis (Inertia + API ouvrable)
- [x] Performance et sécurité adressées

**✅ Patterns d'implémentation**

- [x] Conventions de nommage établies
- [x] Patterns de structure définis (Clean Architecture)
- [x] Formats de communication spécifiés
- [x] Process patterns documentés
- [x] Enforcement rules et anti-patterns définis

**✅ Structure projet**

- [x] Arborescence complète définie
- [x] Frontières de composants établies
- [x] Points d'intégration cartographiés
- [x] Mapping exigences → structure complet

### Architecture Readiness Assessment

**Statut : PRÊT POUR L'IMPLÉMENTATION**

**Niveau de confiance : Élevé**

**Forces :**

- Clean Architecture rigoureuse — coeur métier protégé et testable
- Stack cohérente et productive pour développeur solo
- Extensibilité multi-sport pensée dès la conception (JSONB + sport_registry)
- API ouvrable sans refactoring (séparation controllers/use cases)
- CI/CD et warnings-as-errors dès le jour 1
- Chaque décision tracée avec justification

**Axes d'amélioration futurs :**

- Routes API (`/api/*`) + Access Tokens
- PWA / mode offline
- Dark mode (tokens prévus)
- Tests E2E
- Documentation API (OpenAPI)

### Implementation Handoff

**Directives pour agents AI :**

- Suivre toutes les décisions architecturales exactement comme documentées
- Utiliser les patterns d'implémentation de manière cohérente sur tous les composants
- Respecter la structure projet et les frontières
- Consulter ce document pour toute question architecturale

**Première priorité d'implémentation :**

```bash
pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr
```
