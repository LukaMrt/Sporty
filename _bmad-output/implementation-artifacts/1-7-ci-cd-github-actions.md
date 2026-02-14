# Story 1.7 : CI/CD GitHub Actions

Status: ready-for-dev

## Story

As a **dev (Luka)**,
I want **une pipeline GitHub Actions qui valide la qualite sur PR et master, et deploie uniquement sur master**,
so that **la qualite est verifiee a chaque changement et le deploiement est automatique sur master** (FR26).

## Acceptance Criteria

1. **Given** le code est pousse sur GitHub **When** une PR est ouverte ou un push est fait sur n'importe quelle branche ciblant master **Then** la pipeline execute : ESLint (`--max-warnings 0`), Prettier check, TypeScript compilation, Vite build frontend
2. **Given** une etape de qualite echoue **When** la pipeline s'execute **Then** la pipeline echoue et bloque le merge
3. **Given** un push est fait directement sur master (merge de PR) **When** la pipeline de qualite passe **Then** un job supplementaire build l'image Docker et la push sur Docker Hub
4. **Given** une PR est ouverte **When** la pipeline s'execute **Then** le job Docker push ne se declenche PAS
5. **Given** le fichier `.github/workflows/ci.yml` est cree **When** je regarde le repo **Then** le fichier est versionne

## Tasks / Subtasks

- [ ] Task 1 : Creer le workflow CI qualite (AC: #1, #2, #4, #5)
  - [ ] Creer `.github/workflows/ci.yml`
  - [ ] Declencheur : `push` sur toutes les branches + `pull_request` ciblant master
  - [ ] Job `quality` :
    - [ ] Runner : `ubuntu-latest`
    - [ ] Setup Node.js (version LTS) + pnpm
    - [ ] `pnpm install --frozen-lockfile`
    - [ ] `pnpm lint` (ESLint avec --max-warnings 0)
    - [ ] `pnpm format:check` (Prettier)
    - [ ] `pnpm typecheck` (tsc --noEmit)
    - [ ] `pnpm build` (Vite build frontend)
- [ ] Task 2 : Creer le job Docker build & push (AC: #3, #4)
  - [ ] Job `docker` dans le meme workflow
  - [ ] Condition : `if: github.ref == 'refs/heads/master' && github.event_name == 'push'`
  - [ ] `needs: quality` (depend du job qualite)
  - [ ] Steps : checkout, setup Docker Buildx, login Docker Hub (secrets), build & push image
  - [ ] Tag image : `latest` + SHA du commit
  - [ ] Secrets requis : `DOCKER_USERNAME`, `DOCKER_PASSWORD` (a configurer dans les settings GitHub)
- [ ] Task 3 : Validation (AC: #1-#5)
  - [ ] Verifier que `.github/workflows/ci.yml` est syntaxiquement valide
  - [ ] Documenter les secrets a configurer dans le README ou dans le fichier lui-meme
  - [ ] `pnpm lint` et `tsc --noEmit` → passent

## Dev Notes

### Structure du workflow

```yaml
name: CI

on:
  push:
    branches: ['*']
  pull_request:
    branches: [master]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm build

  docker:
    needs: quality
    if: github.ref == 'refs/heads/master' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/sporty:latest
            ${{ secrets.DOCKER_USERNAME }}/sporty:${{ github.sha }}
```

### Politique qualite en CI

| Outil      | Commande            | Echec si                               |
| ---------- | ------------------- | -------------------------------------- |
| ESLint     | `pnpm lint`         | Un warning existe (`--max-warnings 0`) |
| Prettier   | `pnpm format:check` | Un fichier n'est pas formate           |
| TypeScript | `pnpm typecheck`    | Erreur de compilation                  |
| Vite       | `pnpm build`        | Erreur de build frontend               |

C'est la meme politique "warnings as errors" que le dev local (Story 1.2).

### Secrets GitHub a configurer

| Secret            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `DOCKER_USERNAME` | Username Docker Hub                            |
| `DOCKER_PASSWORD` | Token d'acces Docker Hub (pas le mot de passe) |

Ces secrets doivent etre configures manuellement dans Settings > Secrets and variables > Actions sur le repo GitHub.

### Workflow de mise a jour homelab (FR26)

La CI push l'image sur Docker Hub. Cote homelab, la mise a jour est manuelle :

```bash
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
```

L'automatisation du deploiement homelab n'est PAS dans le scope de cette story.

### Versions des actions GitHub

Toujours utiliser des versions majeures fixees (ex: `@v4`) pour eviter les breaking changes :

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `pnpm/action-setup@v4`
- `docker/setup-buildx-action@v3`
- `docker/login-action@v3`
- `docker/build-push-action@v6`

### Anti-patterns a eviter

- Ne PAS utiliser `@latest` ou `@main` pour les actions GitHub — fixer les versions
- Ne PAS skip les hooks de pre-commit dans la CI (pas de `--no-verify`)
- Ne PAS mettre de secrets en dur dans le fichier YAML
- Ne PAS declencher le job Docker sur les PRs — uniquement sur master

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment — CI/CD]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — CI/CD]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
