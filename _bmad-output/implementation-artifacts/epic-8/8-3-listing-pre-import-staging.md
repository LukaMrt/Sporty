# Story 8.3 : Listing pre-import & staging

Status: review

## Story

As a **utilisateur avec un connecteur Strava connecte**,
I want **voir la liste de mes seances Strava disponibles a l'import**,
so that **je peux choisir lesquelles importer** (FR7, FR29).

## Acceptance Criteria

1. **Given** mon connecteur est en etat `connected` **When** j'accede a la page Import **Then** le systeme appelle `GET /athlete/activities` via StravaHttpClient avec `per_page=200` et `after` = 1 mois par defaut
2. **Given** les activites sont recuperees **When** elles sont traitees **Then** elles sont sauvegardees dans `import_activities` avec status `new` et `raw_data` = SummaryActivity brute, deduplication via contrainte unique
3. **Given** des activites existent deja en staging **When** la page se charge **Then** les activites deja importees ou ignorees conservent leur statut
4. **Given** le connecteur est en etat `error` ou `disconnected` **When** j'accede a la page Import **Then** un message m'invite a (re)connecter Strava, pas d'appel API
5. **Given** les performances **When** le listing se charge **Then** il repond en moins de 5 secondes pour 1 mois de donnees

## Tasks / Subtasks

- [x] Task 1 : Use case ListPreImportActivities (AC: #1, #2, #3)
  - [x] Verifier etat connecteur
  - [x] Appeler l'API Strava via StravaHttpClient
  - [x] Sauvegarder les nouvelles activites en staging (upsert)
  - [x] Retourner la liste complete avec statuts
- [x] Task 2 : Route et controller (AC: #1, #4)
  - [x] Route `GET /import` ou `GET /import/activities`
  - [x] Gestion des cas erreur/disconnected
- [x] Task 3 : Plage temporelle par defaut (AC: #1)
  - [x] Defaut : 1 mois en arriere
  - [x] Parametrable via query params (date_from, date_to)

## Dev Notes

### API Strava endpoint

```
GET https://www.strava.com/api/v3/athlete/activities?per_page=200&after={timestamp}
```

`after` est un epoch timestamp. Pour 1 mois par defaut : `Date.now() / 1000 - 30 * 24 * 3600`.

### Deduplication

La contrainte unique `(connector_id, external_id)` empeche les doublons. Utiliser un upsert ou un INSERT ... ON CONFLICT DO NOTHING.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.3]

## Dev Agent Record

### Implementation Plan

- Pattern `ConnectorFactory` domain port → `StravaConnectorFactory` infra : resout le probleme des tokens per-user au runtime sans violer la regle depcruise use-cases-only-domain.
- `Connector` abstract class enrichie d'un `readonly id: number` pour que le use case puisse identifier le connecteur DB sans reinjecter `ConnectorRepository`.
- `firstOrCreate` (pas `updateOrCreate`) dans `LucidImportActivityRepository` : preserve les statuts `imported`/`ignored` existants (AC#3).
- `ConnectorNotConnectedError` extraite dans `app/domain/errors/` (cohérent avec `ConnectorAuthError`).
- `DEFAULT_LOOKBACK_MS` constante nommée dans le use case.
- `STRAVA_API_BASE` constante dans `strava_connector.ts`.

### Completion Notes

Tous les AC satisfaits. 5 tests unitaires (use case) + 3 tests fonctionnels (route). TS, ESLint, depcruiser : 0 erreurs.

## File List

- `app/domain/interfaces/connector.ts` — ajout `readonly id: number`
- `app/domain/interfaces/connector_repository.ts` — ajout `ConnectorFullRecord` + `findFullByUserAndProvider`
- `app/domain/interfaces/import_activity_repository.ts` — nouveau port
- `app/domain/interfaces/connector_factory.ts` — nouveau port
- `app/domain/errors/connector_not_connected_error.ts` — nouvelle erreur domain
- `app/connectors/strava/strava_connector.ts` — nouveau adaptateur
- `app/connectors/strava/strava_connector_factory.ts` — nouvelle factory
- `app/repositories/lucid_connector_repository.ts` — implémentation `findFullByUserAndProvider`
- `app/repositories/lucid_import_activity_repository.ts` — nouveau repository
- `app/use_cases/import/list_pre_import_activities.ts` — nouveau use case
- `app/controllers/import/import_controller.ts` — nouveau controller
- `inertia/pages/Import/Index.tsx` — nouvelle page Inertia
- `start/routes.ts` — route `GET /import/activities`
- `providers/app_provider.ts` — bindings `ImportActivityRepository` + `ConnectorFactory`
- `tests/unit/use_cases/import/list_pre_import_activities.spec.ts` — 5 tests unitaires
- `tests/functional/import/import_activities.spec.ts` — 3 tests fonctionnels
- `tests/unit/connectors/strava/strava_http_client.spec.ts` — ajout `findFullByUserAndProvider` au mock
- `tests/unit/services/strava/strava_http_client.spec.ts` — ajout `findFullByUserAndProvider` au mock

## Change Log

- 2026-03-08 : Implémentation Story 8.3 — listing pre-import & staging Strava
