# Story 1.1 : Initialisation du projet AdonisJS

Status: done

## Story

As a **dev (Luka)**,
I want **initialiser le projet avec le starter AdonisJS Inertia React**,
so that **j'ai un projet fonctionnel avec la stack de base prete a developper**.

## Acceptance Criteria

1. **Given** aucun projet n'existe encore **When** je lance la commande d'initialisation **Then** le projet est cree avec AdonisJS, Inertia, React, Lucid ORM, VineJS et le systeme d'auth
2. **Given** le projet est initialise **When** je lance `node ace serve --hmr` **Then** le serveur demarre sans erreur et affiche la page d'accueil par defaut dans le navigateur

## Tasks / Subtasks

- [x] Task 1 : Initialiser le projet AdonisJS (AC: #1)
  - [x] Executer `pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr`
  - [x] Verifier que les packages suivants sont presents : `@adonisjs/core`, `@adonisjs/lucid`, `@adonisjs/auth`, `@adonisjs/inertia`, `@adonisjs/shield`, `@vinejs/vine`, `@inertiajs/react`
  - [x] Verifier que le projet utilise ESM (`"type": "module"` dans package.json)
  - [x] Verifier que TypeScript strict est active (`tsconfig.json` avec `strict: true`)
- [x] Task 2 : Valider le fonctionnement (AC: #2)
  - [x] Lancer `node ace serve --hmr`
  - [x] Confirmer que la page d'accueil AdonisJS s'affiche dans le navigateur
  - [x] Confirmer que le hot-reload fonctionne (modifier un fichier React → le navigateur se met a jour)

## Dev Notes

### Commande exacte d'initialisation

```bash
pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr
```

Le flag `--no-ssr` est obligatoire — l'app n'a pas besoin de SSR (elle est derriere authentification, pas de SEO).

### Ce que le starter fournit nativement

| Composant                | Fourni | Details                            |
| ------------------------ | ------ | ---------------------------------- |
| AdonisJS v6              | oui    | Framework backend, ESM, TypeScript |
| Inertia.js               | oui    | Bridge backend-frontend            |
| React                    | oui    | Frontend via Inertia adapter       |
| Lucid ORM                | oui    | Active Record, migrations, seeders |
| VineJS                   | oui    | Validation                         |
| Auth (sessions + guards) | oui    | Cookie-based, CSRF integre         |
| Shield                   | oui    | CSRF, CSP, headers securite        |
| Vite                     | oui    | Bundler frontend avec HMR          |

### Ce qui reste a configurer dans les stories suivantes

- Tailwind CSS + Shadcn/ui (Story 1.4)
- ESLint + Prettier strict (Story 1.2)
- Structure Clean Architecture (Story 1.3)
- Docker Compose (Story 1.5)
- Migrations DB (Story 1.6)
- CI/CD (Story 1.7)

### Structure de fichiers attendue apres initialisation

```
sporty/
├── app/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── validators/
├── config/
│   ├── app.ts
│   ├── auth.ts
│   ├── database.ts
│   ├── hash.ts
│   ├── inertia.ts
│   └── shield.ts
├── database/
│   └── migrations/
├── inertia/
│   ├── app/
│   ├── pages/
│   └── components/
├── start/
│   ├── routes.ts
│   ├── kernel.ts
│   └── env.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Project Structure Notes

- Cette story cree la base du projet. Les dossiers Clean Architecture (`domain/`, `use_cases/`, `repositories/`) seront ajoutes en Story 1.3
- Ne PAS modifier la structure du starter a ce stade — elle sera enrichie incrementalement

### Anti-patterns a eviter

- Ne PAS ajouter de dependances supplementaires dans cette story (Tailwind, ESLint custom, etc.)
- Ne PAS configurer Docker — c'est la Story 1.5
- Ne PAS creer de fichiers `.env` custom — le starter en fournit un par defaut

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Selected Starter: AdonisJS Inertia Starter Kit (React)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- pnpm path issue sur Windows : exécution manuelle par l'utilisateur car le shell bash ne résolvait pas correctement le shim pnpm
- Projet créé dans `sporty/` puis déplacé à la racine pour éviter le double nesting `Sporty/sporty/`

### Completion Notes List

- Task 1 : Projet initialisé via `pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr` avec auth session + PostgreSQL. Tous les packages requis présents. ESM activé. TypeScript strict via `@adonisjs/tsconfig` (toutes les options strict individuellement activées).
- Task 2 : Serveur démarre sans erreur via `pnpm run dev`, page d'accueil Inertia/React affichée, hot-reload fonctionnel. Validé manuellement par l'utilisateur.
- Fichiers déplacés de `sporty/` vers la racine du projet, `pnpm install` relancé avec succès.

### File List

- ace.js
- adonisrc.ts
- app/ (controllers, middleware, models, validators, exceptions)
- bin/server.ts, bin/console.ts, bin/test.ts
- config/ (app.ts, auth.ts, database.ts, hash.ts, inertia.ts, shield.ts, cors.ts, session.ts, static.ts, logger.ts)
- database/migrations/
- eslint.config.js
- inertia/ (app/, pages/, components/, css/)
- package.json
- pnpm-lock.yaml
- resources/views/
- start/ (routes.ts, kernel.ts, env.ts)
- tests/
- tsconfig.json
- vite.config.ts

### Change Log

- 2026-02-14 : Story 1-1 implémentée — initialisation projet AdonisJS v6 avec Inertia/React, Lucid (PostgreSQL), Auth (session), Shield, VineJS
