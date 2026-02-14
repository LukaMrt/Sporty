# Epic 1 : Squelette Technique & Environnement de Dev

Luka (dev) a un projet initialise, structure, containerise, avec une CI propre et une base de donnees prete. Il peut developper sereinement. Aucune feature end-user, mais tout le socle est la.

**FRs couverts :** FR25, FR26
**Includes :** Init starter AdonisJS (Inertia+React), structure Clean Architecture (dossiers domain/use_cases/repositories), Tailwind + Shadcn/ui, Docker Compose (app + PostgreSQL), CI/CD GitHub Actions, warnings as errors, migrations initiales (users, sessions, sports), seeders sports

---

## Story 1.1 : Initialisation du projet AdonisJS

As a **dev (Luka)**,
I want **initialiser le projet avec le starter AdonisJS Inertia React**,
So that **j'ai un projet fonctionnel avec la stack de base prete a developper**.

**Acceptance Criteria:**

**Given** aucun projet n'existe encore
**When** je lance `pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr`
**Then** le projet est cree avec AdonisJS, Inertia, React, Lucid ORM, VineJS et le systeme d'auth
**And** `node ace serve --hmr` demarre sans erreur et affiche la page d'accueil par defaut dans le navigateur

**Comment tu valides :** `node ace serve --hmr` -> tu vois la page AdonisJS dans le navigateur.

---

## Story 1.2 : Configuration qualite de code

As a **dev (Luka)**,
I want **configurer ESLint, Prettier et TypeScript en mode strict avec warnings as errors**,
So that **tout code non conforme est bloque des le depart, pas de dette technique**.

**Acceptance Criteria:**

**Given** le projet est initialise (Story 1.1)
**When** je lance `pnpm lint`
**Then** ESLint s'execute avec `--max-warnings 0` et echoue si un warning existe
**And** `pnpm format:check` verifie le formatage Prettier
**And** `tsc --noEmit` compile sans erreur ni warning en mode strict

**Comment tu valides :** Ajoute un `console.log` inutile -> `pnpm lint` echoue. Retire-le -> ca passe.

---

## Story 1.3 : Structure Clean Architecture

As a **dev (Luka)**,
I want **mettre en place la structure de dossiers Clean Architecture**,
So that **le code est organise des le depart avec des frontieres claires entre controllers, use cases, domain et repositories**.

**Acceptance Criteria:**

**Given** le projet est initialise et la qualite de code configuree
**When** j'ouvre le projet dans mon editeur
**Then** les dossiers suivants existent dans `app/` : `controllers/`, `domain/entities/`, `domain/value_objects/`, `domain/errors/`, `domain/interfaces/`, `use_cases/`, `repositories/`, `validators/`, `middleware/`
**And** chaque dossier contient un fichier `.gitkeep` ou un fichier d'exemple minimal
**And** `pnpm lint` et `tsc --noEmit` passent toujours

**Comment tu valides :** `ls app/domain/entities` -> le dossier existe. `pnpm lint` -> vert.

---

## Story 1.4 : Configuration Tailwind CSS + Shadcn/ui

As a **dev (Luka)**,
I want **configurer Tailwind CSS et initialiser Shadcn/ui**,
So that **le design system est pret a etre utilise avec les tokens de design (couleurs, typo, espacements)**.

**Acceptance Criteria:**

**Given** le projet est initialise
**When** j'ouvre la page d'accueil dans le navigateur
**Then** Tailwind CSS est actif (les classes utilitaires fonctionnent)
**And** les tokens de design Sporty sont configures dans `tailwind.config.ts` (palette bleu accent, gris, espacements 4px)
**And** Shadcn/ui est initialise et au moins un composant (Button) est importable
**And** la police system native est definie comme font par defaut

**Comment tu valides :** Ajoute `<button className="bg-primary text-white p-4">Test</button>` dans une page -> le bouton apparait bleu avec du padding.

---

## Story 1.5 : Docker Compose (app + PostgreSQL)

As a **dev (Luka)**,
I want **un docker-compose.yml qui lance l'app et PostgreSQL**,
So that **je peux deployer et developper avec un seul `docker compose up`** (FR25).

**Acceptance Criteria:**

**Given** Docker est installe sur la machine
**When** je lance `docker compose up`
**Then** deux containers demarrent : `app` (AdonisJS) et `db` (PostgreSQL)
**And** l'app est accessible dans le navigateur sur le port configure
**And** PostgreSQL est configure via variables d'environnement dans `.env`
**And** les donnees PostgreSQL persistent dans un volume Docker (NFR15)
**And** `.env` est versionne avec les valeurs par defaut de developpement
**And** `.env.local` est dans `.gitignore` et permet de surcharger les valeurs de `.env`

**Comment tu valides :** `docker compose up -d` sans `.env.local` -> ca tourne avec les valeurs par defaut. Cree un `.env.local` avec un port different -> il est pris en compte.

---

## Story 1.6 : Migrations initiales & seeders

As a **dev (Luka)**,
I want **les migrations pour les tables users, sessions et sports, et un seeder pour les sports de base**,
So that **le modele de donnees est en place et pret pour le developpement des features**.

**Acceptance Criteria:**

**Given** PostgreSQL tourne via Docker Compose
**When** je lance `node ace migration:run`
**Then** les tables `users`, `sessions` et `sports` sont creees
**And** `users` contient : id, email, password, full_name, role (admin/user), timestamps
**And** `sessions` contient : id, user_id (FK), sport_type, date, duration_minutes, distance_km, avg_heart_rate, perceived_effort, sport_metrics (JSONB), deleted_at (nullable), timestamps
**And** `sports` contient : id, name, slug, default_metrics (JSONB), timestamps
**And** `node ace db:seed` cree le sport "Course a pied" avec ses metriques par defaut
**And** `node ace migration:rollback` annule proprement les migrations

**Comment tu valides :** `node ace migration:run` -> `node ace db:seed` -> connecte-toi a PostgreSQL -> `SELECT * FROM sports;` -> tu vois "Course a pied".

---

## Story 1.7 : CI/CD GitHub Actions

As a **dev (Luka)**,
I want **une pipeline GitHub Actions qui valide la qualite sur PR et master, et deploie uniquement sur master**,
So that **la qualite est verifiee a chaque changement et le deploiement est automatique sur master** (FR26).

**Acceptance Criteria:**

**Given** le code est pousse sur GitHub
**When** une PR est ouverte ou un push est fait sur n'importe quelle branche ciblant master
**Then** la pipeline execute : ESLint (`--max-warnings 0`), Prettier check, TypeScript compilation, Vite build frontend
**And** la pipeline echoue si l'une de ces etapes echoue

**Given** un push est fait directement sur master (merge de PR)
**When** la pipeline de qualite passe
**Then** un job supplementaire build l'image Docker et la push sur Docker Hub
**And** ce job de deploiement ne se declenche **pas** sur les PRs

**And** le fichier `.github/workflows/ci.yml` est versionne

**Comment tu valides :** Pousse une PR -> lint + format + build s'executent, pas de Docker push. Merge sur master -> lint + format + build + Docker push.
