# Story 7.2 : Domain connecteur & interface Connector

Status: done

## Story

As a **dev (Luka)**,
I want **l'interface abstraite Connector dans le domain et les erreurs associees**,
so that **l'architecture extensible est en place pour accueillir Strava et de futurs connecteurs** (NFR10).

## Acceptance Criteria

1. **Given** la structure Clean Architecture existante **When** je consulte `app/domain/interfaces/connector.ts` **Then** l'interface `Connector` definit : `authenticate()`, `listActivities(filters)`, `getActivityDetail(id)`, `getConnectionStatus()`, `disconnect()`
2. **Given** le domain **When** je consulte `app/domain/errors/` **Then** les erreurs `ConnectorAuthError`, `ConnectorNotFoundError`, `RateLimitExceededError` existent
3. **Given** le domain **When** je consulte `app/domain/value_objects/connector_status.ts` **Then** le value object `ConnectorStatus` (connected/error/disconnected) est defini
4. **Given** le fichier `.dependency-cruiser.cjs` **When** je verifie les regles **Then** `app/connectors/` est traite comme infra (meme niveau que repositories)
5. **Given** le domain **When** je verifie les imports **Then** `app/domain/` n'importe depuis aucun autre dossier `app/`
6. **Given** les fichiers sont crees **When** je lance `pnpm lint` et `tsc --noEmit` **Then** tout passe sans erreur

## Tasks / Subtasks

- [x] Task 1 : Interface Connector (AC: #1)
  - [x] Creer `app/domain/interfaces/connector.ts`
  - [x] Definir les methodes : authenticate, listActivities, getActivityDetail, getConnectionStatus, disconnect
  - [x] Definir les types de retour et les filtres
- [x] Task 2 : Erreurs domain (AC: #2)
  - [x] Creer `ConnectorAuthError` dans `app/domain/errors/`
  - [x] Creer `ConnectorNotFoundError`
  - [x] Creer `RateLimitExceededError`
- [x] Task 3 : Value object ConnectorStatus (AC: #3)
  - [x] Creer `app/domain/value_objects/connector_status.ts`
  - [x] Enum ou union type : connected | error | disconnected
- [x] Task 4 : Regles dependency-cruiser (AC: #4)
  - [x] Ajouter `app/connectors/` dans `.dependency-cruiser.cjs`
- [x] Task 5 : Validation (AC: #5, #6)
  - [x] Verifier que domain n'importe rien d'autre
  - [x] `pnpm lint` et `tsc --noEmit` passent

## Dev Notes

### Interface Connector

```typescript
interface Connector {
  authenticate(): Promise<ConnectorTokens>
  listActivities(filters: ActivityFilters): Promise<ExternalActivity[]>
  getActivityDetail(externalId: string): Promise<ExternalActivityDetail>
  getConnectionStatus(): Promise<ConnectorStatus>
  disconnect(): Promise<void>
}
```

### Coherence avec l'existant

Les erreurs domain doivent suivre le meme pattern que les erreurs existantes dans `app/domain/errors/` (ex: `SessionNotFoundError`).

### References

- [Source: _bmad-output/planning-artifacts/architecture-import-connectors.md#Clean Architecture]
- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.2]

## Dev Agent Record

### Implementation Notes

- `app/domain/interfaces/connector.ts` : classe abstraite (pas interface TypeScript) — obligatoire pour l'IoC AdonisJS. Types utilitaires `ConnectorTokens`, `ActivityFilters`, `ActivitySummary`, `ActivityDetail` définis dans le même fichier (nommage domain-first, sans préfixe "External").
- `connector_status.ts` et `connector_provider.ts` étaient déjà créés en Story 7.1 — AC#3 satisfait sans modification.
- `.dependency-cruiser.cjs` : `connectors` ajouté dans `use-cases-only-domain` (ban import depuis use_cases) et dans `infra-no-http-nor-usecases` (traité comme infra au même niveau que repositories/services).
- CI verte : lint, tsc, depcruise, tests passent.

### File List

- `app/domain/interfaces/connector.ts` (nouveau)
- `app/domain/errors/connector_auth_error.ts` (nouveau)
- `app/domain/errors/connector_not_found_error.ts` (nouveau)
- `app/domain/errors/rate_limit_exceeded_error.ts` (nouveau)
- `.dependency-cruiser.cjs` (modifié)

### Change Log

- Story 7.2 implémentée : port Connector abstrait, 3 erreurs domain, règles depcruise étendues à app/connectors/
