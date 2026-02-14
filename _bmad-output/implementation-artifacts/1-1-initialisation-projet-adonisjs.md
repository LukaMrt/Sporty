# Story 1.1 : Initialisation du projet AdonisJS

Status: ready-for-dev

## Story

As a **dev (Luka)**,
I want **initialiser le projet avec le starter AdonisJS Inertia React**,
so that **j'ai un projet fonctionnel avec la stack de base prete a developper**.

## Acceptance Criteria

1. **Given** aucun projet n'existe encore **When** je lance la commande d'initialisation **Then** le projet est cree avec AdonisJS, Inertia, React, Lucid ORM, VineJS et le systeme d'auth
2. **Given** le projet est initialise **When** je lance `node ace serve --hmr` **Then** le serveur demarre sans erreur et affiche la page d'accueil par defaut dans le navigateur

## Tasks / Subtasks

- [ ] Task 1 : Initialiser le projet AdonisJS (AC: #1)
  - [ ] Executer `pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr`
  - [ ] Verifier que les packages suivants sont presents : `@adonisjs/core`, `@adonisjs/lucid`, `@adonisjs/auth`, `@adonisjs/inertia`, `@adonisjs/shield`, `@vinejs/vine`, `@inertiajs/react`
  - [ ] Verifier que le projet utilise ESM (`"type": "module"` dans package.json)
  - [ ] Verifier que TypeScript strict est active (`tsconfig.json` avec `strict: true`)
- [ ] Task 2 : Valider le fonctionnement (AC: #2)
  - [ ] Lancer `node ace serve --hmr`
  - [ ] Confirmer que la page d'accueil AdonisJS s'affiche dans le navigateur
  - [ ] Confirmer que le hot-reload fonctionne (modifier un fichier React → le navigateur se met a jour)

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

### Debug Log References

### Completion Notes List

### File List
