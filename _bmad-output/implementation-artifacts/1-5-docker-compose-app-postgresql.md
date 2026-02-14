# Story 1.5 : Docker Compose (app + PostgreSQL)

Status: ready-for-dev

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

- [ ] Task 1 : Creer le Dockerfile multi-stage (AC: #1, #2)
  - [ ] Stage 1 (deps) : `FROM node:lts-alpine`, installer pnpm, copier package.json + pnpm-lock.yaml, `pnpm install --frozen-lockfile`
  - [ ] Stage 2 (build) : copier le code source, `pnpm build` (tsc backend + vite frontend)
  - [ ] Stage 3 (runtime) : image minimale, copier build + node_modules de production, exposer le port, CMD `node bin/server.js`
  - [ ] Creer `.dockerignore` (node_modules, .git, tests, _bmad*, etc.)
- [ ] Task 2 : Creer docker-compose.yml (AC: #1, #3, #5)
  - [ ] Service `app` : build depuis Dockerfile, ports, depends_on `db`, env_file
  - [ ] Service `db` : image `postgres:16-alpine`, variables d'env, volume persistant
  - [ ] Volume nomme pour les donnees PostgreSQL
  - [ ] Configuration via variables d'environnement dans `.env`
- [ ] Task 3 : Configurer les variables d'environnement (AC: #3, #4)
  - [ ] Creer/mettre a jour `.env` avec les valeurs par defaut de developpement
  - [ ] Variables DB : `DB_HOST=localhost`, `DB_PORT=5432`, `DB_USER=sporty`, `DB_PASSWORD=sporty`, `DB_DATABASE=sporty`
  - [ ] Variables app : `PORT=3333`, `HOST=0.0.0.0`, `NODE_ENV=development`, `APP_KEY=<genere>`, `SESSION_DRIVER=cookie`
  - [ ] Ajouter `.env.local` dans `.gitignore` (surcharge locale)
  - [ ] Documenter dans `.env` que `.env.local` peut surcharger les valeurs
- [ ] Task 4 : Configurer la connexion DB dans AdonisJS (AC: #2)
  - [ ] Verifier `config/database.ts` — doit lire les variables d'env `DB_*`
  - [ ] Verifier `start/env.ts` — les variables DB doivent etre validees
- [ ] Task 5 : Validation (AC: #1-#5)
  - [ ] `docker compose up -d` → les 2 containers demarrent
  - [ ] L'app repond dans le navigateur
  - [ ] `docker compose down && docker compose up -d` → les donnees DB persistent
  - [ ] Lancer `pnpm lint` et `tsc --noEmit` → passent

## Dev Notes

### Architecture Docker

```yaml
services:
  app:    # AdonisJS + React (Vite build integre)
    build: .
    ports:
      - "${PORT:-3333}:${PORT:-3333}"
    depends_on:
      - db
    env_file:
      - .env
      - .env.local  # optionnel, surcharge

  db:     # PostgreSQL 16
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-sporty}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-sporty}
      POSTGRES_DB: ${DB_DATABASE:-sporty}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Dockerfile multi-stage

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS build
COPY . .
RUN pnpm build

# Stage 3: Runtime
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
EXPOSE ${PORT:-3333}
CMD ["node", "build/bin/server.js"]
```

### Strategie de developpement local

Pour le dev local, on n'utilise PAS le container app — on lance PostgreSQL via Docker et AdonisJS directement :
- `docker compose up db` — lance PostgreSQL seul
- `node ace serve --hmr` — lance AdonisJS avec hot reload

Le Dockerfile sert pour la CI/CD (build + push image) et le deploiement homelab.

### Variables d'environnement

| Variable | Defaut dev | Description |
|----------|-----------|-------------|
| `PORT` | 3333 | Port de l'app |
| `HOST` | 0.0.0.0 | Host de l'app |
| `NODE_ENV` | development | Environnement |
| `APP_KEY` | (genere) | Cle de chiffrement AdonisJS |
| `SESSION_DRIVER` | cookie | Driver de session |
| `DB_HOST` | localhost | Host PostgreSQL |
| `DB_PORT` | 5432 | Port PostgreSQL |
| `DB_USER` | sporty | User PostgreSQL |
| `DB_PASSWORD` | sporty | Password PostgreSQL |
| `DB_DATABASE` | sporty | Nom de la base |

Note : quand l'app tourne dans Docker, `DB_HOST` doit etre `db` (nom du service). Quand elle tourne en local, c'est `localhost`.

### Anti-patterns a eviter

- Ne PAS versionner de secrets dans `.env` — les valeurs par defaut sont pour le dev local uniquement
- Ne PAS utiliser `latest` pour l'image PostgreSQL — fixer la version majeure (`postgres:16-alpine`)
- Ne PAS exposer le port PostgreSQL en production (uniquement pour le dev local)
- Ne PAS utiliser `docker compose up` pour le dev quotidien — utiliser `docker compose up db` + `node ace serve --hmr`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment]
- [Source: _bmad-output/planning-artifacts/architecture.md#Development Workflow]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
