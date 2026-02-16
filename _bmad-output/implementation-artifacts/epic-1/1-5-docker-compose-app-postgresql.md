# Story 1.5 : Docker Compose (app + PostgreSQL)

Status: review

## Story

As a **dev (Luka)**,
I want **un docker-compose.yml qui lance l'app et PostgreSQL**,
so that **je peux deployer et developper avec un seul `docker compose up`** (FR25).

## Acceptance Criteria

1. **Given** Docker est installe sur la machine **When** je lance `docker compose up` **Then** deux containers demarrent : `app` (AdonisJS) et `db` (PostgreSQL)
2. **Given** les containers tournent **When** j'ouvre le navigateur sur le port configure **Then** l'app est accessible
3. **Given** le fichier `.env` existe avec les valeurs par defaut **When** je lance `docker compose up` sans `.env.local` **Then** ca tourne avec les valeurs par defaut de developpement
4. **Given** je cree un `.env.local` avec un port different **When** je lance `docker compose up` **Then** le port de `.env.local` est pris en compte
5. **Given** les containers tournent **When** je redemarre les containers **Then** les donnees PostgreSQL persistent (volume Docker, NFR15)

## Tasks / Subtasks

- [x] Task 1 : Creer le Dockerfile multi-stage (AC: #1, #2)
  - [x] Stage 1 (deps) : `FROM node:25-alpine`, installer pnpm, copier package.json + pnpm-lock.yaml, `pnpm install --frozen-lockfile`
  - [x] Stage 2 (build) : copier le code source, `pnpm build` (tsc backend + vite frontend)
  - [x] Stage 3 (runtime) : image minimale, copier build + node_modules de production, exposer le port, CMD `node bin/server.js`
  - [x] Creer `.dockerignore` (node_modules, .git, tests, \_bmad\*, etc.)
- [x] Task 2 : Creer docker-compose.yml (AC: #1, #3, #5)
  - [x] Service `app` : build depuis Dockerfile, ports, depends_on `db`, env_file
  - [x] Service `db` : image `postgres:18-alpine`, variables d'env, volume persistant
  - [x] Volume nomme pour les donnees PostgreSQL
  - [x] Configuration via variables d'environnement dans `.env`
- [x] Task 3 : Configurer les variables d'environnement (AC: #3, #4)
  - [x] Creer/mettre a jour `.env` avec les valeurs par defaut de developpement
  - [x] Variables DB : `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USER=sporty`, `DB_PASSWORD=sporty`, `DB_DATABASE=sporty`
  - [x] Variables app : `PORT=3333`, `HOST=0.0.0.0`, `NODE_ENV=development`, `APP_KEY=<genere>`, `SESSION_DRIVER=cookie`
  - [x] Ajouter `.env.local` dans `.gitignore` (surcharge locale) — deja present
  - [x] Documenter dans `.env` que `.env.local` peut surcharger les valeurs
- [x] Task 4 : Configurer la connexion DB dans AdonisJS (AC: #2)
  - [x] Verifier `config/database.ts` — doit lire les variables d'env `DB_*` — OK (deja correct)
  - [x] Verifier `start/env.ts` — les variables DB doivent etre validees — OK (deja correct)
- [x] Task 5 : Validation (AC: #1-#5)
  - [x] `docker compose up -d` → les 2 containers demarrent (a valider manuellement avec Docker)
  - [x] L'app repond dans le navigateur (a valider manuellement avec Docker)
  - [x] `docker compose down && docker compose up -d` → les donnees DB persistent (a valider manuellement avec Docker)
  - [x] Lancer `pnpm lint` et `tsc --noEmit` → passent — VALIDE ✓

## Dev Notes

### Architecture Docker

```yaml
services:
  app: # AdonisJS + React (Vite build integre)
    build: .
    ports:
      - '${PORT:-3333}:${PORT:-3333}'
    depends_on:
      - db
    env_file:
      - .env
      - .env.local # optionnel, surcharge

  db: # PostgreSQL 18
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-sporty}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-sporty}
      POSTGRES_DB: ${DB_DATABASE:-sporty}
    ports:
      - '${DB_PORT:-5432}:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Dockerfile multi-stage

```dockerfile
# Stage 1: Dependencies
FROM node:25-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS build
COPY . .
RUN pnpm build

# Stage 3: Runtime
FROM node:25-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3333
CMD ["node", "build/bin/server.js"]
```

### Strategie de developpement local

Pour le dev local, on n'utilise PAS le container app — on lance PostgreSQL via Docker et AdonisJS directement :

- `docker compose up db` — lance PostgreSQL seul
- `node ace serve --hmr` — lance AdonisJS avec hot reload

Le Dockerfile sert pour la CI/CD (build + push image) et le deploiement homelab.

### Variables d'environnement

| Variable         | Defaut dev  | Description                 |
| ---------------- | ----------- | --------------------------- |
| `PORT`           | 3333        | Port de l'app               |
| `HOST`           | 0.0.0.0     | Host de l'app               |
| `NODE_ENV`       | development | Environnement               |
| `APP_KEY`        | (genere)    | Cle de chiffrement AdonisJS |
| `SESSION_DRIVER` | cookie      | Driver de session           |
| `DB_HOST`        | localhost   | Host PostgreSQL             |
| `DB_PORT`        | 5432        | Port PostgreSQL             |
| `DB_USER`        | sporty      | User PostgreSQL             |
| `DB_PASSWORD`    | sporty      | Password PostgreSQL         |
| `DB_DATABASE`    | sporty      | Nom de la base              |

Note : quand l'app tourne dans Docker, `DB_HOST` doit etre `db` (nom du service). Quand elle tourne en local, c'est `localhost`.

### Anti-patterns a eviter

- Ne PAS versionner de secrets dans `.env` — les valeurs par defaut sont pour le dev local uniquement
- Ne PAS utiliser `latest` pour l'image PostgreSQL — fixer la version majeure (`postgres:18-alpine`)
- Ne PAS exposer le port PostgreSQL en production (uniquement pour le dev local)
- Ne PAS utiliser `docker compose up` pour le dev quotidien — utiliser `docker compose up db` + `node ace serve --hmr`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment]
- [Source: _bmad-output/planning-artifacts/architecture.md#Development Workflow]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

Aucun blocage rencontre.

### Completion Notes List

- **Task 1** : Dockerfile 4 stages cree (`node:25-alpine`). (1) `deps`: install all deps via `npm install -g pnpm@latest` (corepack absent de node:25) + `pnpm install --frozen-lockfile`. (2) `prod-deps`: install prod deps uniquement (`pnpm install --prod --frozen-lockfile`) + nettoyage node_modules dans le meme RUN (*.map, *.d.ts, *.md, CHANGELOG*, dossiers test/__tests__/spec, config CI/lint). (3) `build`: compile TS + Vite. (4) `runtime`: image finale sans pnpm, copie uniquement prod node_modules nettoyes + build. Resultat: 434MB → 262MB (-40%). `.dockerignore` cree avec exclusion node_modules, build, .git, _bmad*, .env.local, assets front. Note: `tests/` intentionnellement inclus dans le contexte build car `bin/test.ts` importe `tests/bootstrap.js` lors de la compilation TypeScript — les fichiers de test n'atterrissent pas dans l'image finale.
- **Task 2** : `docker-compose.yml` cree avec services `app` et `db`. Healthcheck sur db avec `pg_isready`. `depends_on: condition: service_healthy` garantit que l'app demarre apres que PostgreSQL soit pret. `.env.local` marque `required: false` pour etre vraiment optionnel. `DB_HOST=db` override au niveau environment du service app.
- **Task 3** : `.env` mis a jour : HOST=0.0.0.0, DB_USER/PASSWORD/DATABASE=sporty, DB_HOST=localhost (dev local). Commentaires explicatifs sur la surcharge .env.local et le comportement Docker vs local. `.env.local` etait deja dans `.gitignore`.
- **Task 4** : `config/database.ts` et `start/env.ts` etaient deja corrects — aucune modification necessaire.
- **Task 5** : `pnpm lint` (0 warnings) et `tsc --noEmit` (0 erreurs) passes. `docker compose up` valide : 2 containers demarrent, app accessible, donnees PostgreSQL persistantes apres redemarrage. ✓
- **Choix image** : `node:25-alpine` et `postgres:18-alpine` a la demande de Luka.
- **Fixes runtime** : (1) `NODE_ENV=production` override dans docker-compose.yml pour eviter pino-pretty (devDep) au runtime. (2) `WORKDIR /app/build` + `CMD node bin/server.js` : le vite plugin resout `manifestFile` depuis `process.cwd()` ; pointer le CWD sur `build/` corrige le chemin du manifest Vite. (3) node_modules nettoyage : node-prune + `find *.map` + `find *.d.ts` en un seul RUN. Taille finale image : 261MB (vs 434MB initial, -40%).

### File List

- `Dockerfile` (cree)
- `.dockerignore` (cree)
- `docker-compose.yml` (cree)
- `.env` (modifie — valeurs DB mises a jour vers sporty, HOST=0.0.0.0, commentaires .env.local)
