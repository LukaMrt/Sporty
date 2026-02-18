# Story 1.2 : Configuration qualite de code

Status: done

## Story

As a **dev (Luka)**,
I want **configurer ESLint, Prettier et TypeScript en mode strict avec warnings as errors**,
so that **tout code non conforme est bloque des le depart, pas de dette technique**.

## Acceptance Criteria

1. **Given** le projet est initialise (Story 1.1) **When** je lance `pnpm lint` **Then** ESLint s'execute avec `--max-warnings 0` et echoue si un warning existe
2. **Given** le projet est initialise **When** je lance `pnpm format:check` **Then** Prettier verifie le formatage et echoue si un fichier n'est pas formate
3. **Given** le projet est initialise **When** je lance `tsc --noEmit` **Then** TypeScript compile sans erreur ni warning en mode strict

## Tasks / Subtasks

- [x] Task 1 : Configurer ESLint (AC: #1)
  - [x] Verifier la config ESLint fournie par le starter AdonisJS
  - [x] S'assurer que le script `lint` dans package.json utilise `--max-warnings 0`
  - [x] Ajouter le script `"lint": "eslint . --max-warnings 0"` si absent ou le modifier
  - [x] Verifier que les regles couvrent TypeScript et React (JSX)
  - [x] Lancer `pnpm lint` et corriger toute erreur ou warning existant
- [x] Task 2 : Configurer Prettier (AC: #2)
  - [x] Verifier si Prettier est deja installe par le starter
  - [x] Si absent, installer : `pnpm add -D prettier`
  - [x] Creer ou verifier `.prettierrc` avec les regles du projet
  - [x] Ajouter le script `"format:check": "prettier --check ."` dans package.json
  - [x] Ajouter le script `"format": "prettier --write ."` dans package.json
  - [x] Creer `.prettierignore` (build/, dist/, node_modules/, .adonisjs/)
  - [x] Lancer `pnpm format` pour formater tout le code existant
  - [x] Verifier qu'il n'y a pas de conflit ESLint/Prettier (installer `eslint-config-prettier` si necessaire)
- [x] Task 3 : Valider TypeScript strict (AC: #3)
  - [x] Verifier que `tsconfig.json` contient `"strict": true`
  - [x] Lancer `tsc --noEmit` et corriger toute erreur
  - [x] Ajouter le script `"typecheck": "tsc --noEmit"` si absent
- [x] Task 4 : Validation croisee
  - [x] Lancer successivement `pnpm lint`, `pnpm format:check`, `pnpm typecheck` — les 3 passent
  - [x] Ajouter volontairement un `console.log` inutile → `pnpm lint` echoue. Le retirer → ca passe

## Dev Notes

### Politique "Warnings as Errors"

C'est une decision architecturale fondamentale du projet : **zero tolerance des le jour 1**.

| Outil      | Flag               | Effet                                      |
| ---------- | ------------------ | ------------------------------------------ |
| ESLint     | `--max-warnings 0` | Tout warning = erreur de build             |
| TypeScript | `strict: true`     | Toutes les verifications strictes activees |
| Prettier   | `--check` mode     | Tout fichier non formate = erreur          |

Ces memes flags seront utilises dans la CI/CD (Story 1.7).

### Config ESLint attendue

Le starter AdonisJS fournit une config ESLint de base. Points a verifier/ajuster :

- Support TypeScript (`@typescript-eslint`)
- Support React/JSX
- Pas de conflit avec Prettier → utiliser `eslint-config-prettier`
- Flag `--max-warnings 0` dans le script npm

### Config Prettier suggeree

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

Note : verifier les conventions par defaut du starter AdonisJS et s'y conformer plutot que d'imposer une config arbitraire. AdonisJS utilise souvent `semi: false` et `singleQuote: true`.

### Conventions de nommage a respecter (architecture.md)

- Fichiers backend : `snake_case.ts` (convention AdonisJS)
- Fichiers React : `PascalCase.tsx` pour les composants
- Classes : `PascalCase`
- Fonctions/methodes : `camelCase`
- Variables : `camelCase`
- Constantes : `UPPER_SNAKE_CASE`

### Anti-patterns a eviter

- Ne PAS desactiver des regles ESLint pour "faire passer" le code — corriger le code
- Ne PAS utiliser `// eslint-disable` sauf cas absolument justifie et documente
- Ne PAS modifier `strict: true` dans tsconfig — c'est non-negociable

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Qualite de code]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

- Crash Bun durant l'edition de eslint.config.js — reprise manuelle
- `not_found.tsx` et `server_error.tsx` renommes en `NotFound.tsx` et `ServerError.tsx` (convention PascalCase React) avec mise a jour handler.ts et routes.ts
- `no-console` ajoute manuellement (absent de RULES_LIST AdonisJS par defaut)

### Completion Notes List

- `@adonisjs/tsconfig/tsconfig.base.json` contient deja tous les flags strict individuellement — `strict: true` ajoute explicitement dans tsconfig.json pour conformite AC
- Prettier config heritee de `@adonisjs/prettier-config` via package.json (deja presente, pas de .prettierrc separe)
- `eslint-config-prettier` deja integre dans `@adonisjs/eslint-config` (via `eslint-plugin-prettier/recommended`)
- Fichiers TSX couverts avec override filename-case (`pascalCase | camelCase`) pour compatibilite pages Inertia et composants React

### File List

- `package.json` — scripts lint, format:check
- `eslint.config.js` — support TSX + no-console + filename-case override
- `tsconfig.json` — strict: true
- `.prettierignore` — cree
- `inertia/pages/Home.tsx` — renomme depuis home.tsx
- `inertia/pages/errors/NotFound.tsx` — renomme depuis not_found.tsx
- `inertia/pages/errors/ServerError.tsx` — renomme depuis server_error.tsx
- `start/routes.ts` — reference mise a jour (Home)
- `app/exceptions/handler.ts` — references mises a jour (NotFound, ServerError)
- Tous les fichiers TS/TSX — formates par Prettier
