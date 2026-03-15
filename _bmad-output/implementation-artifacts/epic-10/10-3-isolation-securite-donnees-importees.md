# Story 10.3 : Isolation et securite des donnees importees

Status: review

## Story

As a **utilisateur**,
I want **que mes seances deja importees restent intactes quoi qu'il arrive au connecteur**,
so that **mes donnees sont en securite independamment de l'etat de la connexion Strava** (FR26).

## Acceptance Criteria

1. **Given** j'ai 10 seances importees **When** mon connecteur passe en `error` ou `disconnected` **Then** les 10 seances restent intactes, visibles dans calendrier/stats/dashboard
2. **Given** je deconnecte Strava **When** le connecteur est supprime **Then** les seances restent avec `imported_from = 'strava'`, les entrees staging sont nettoyees
3. **Given** je reconnecte Strava **When** le systeme fetch les activites **Then** les activites deja importees (matchees par `external_id`) ne sont pas reimportees, elles apparaissent en staging avec statut `imported`
4. **Given** une seance importee est modifiee manuellement **When** la meme activite est re-fetchee **Then** la modification locale est preservee (one-way snapshot)

## Tasks / Subtasks

- [x] Task 1 : Verifier isolation au disconnect (AC: #1, #2)
  - [x] La deconnexion ne supprime pas les sessions
  - [x] Nettoyage des import_activities (cascade ou explicite)
- [x] Task 2 : Detection doublons a la reconnexion (AC: #3)
  - [x] Lors du staging, verifier si une session avec le meme `external_id` existe
  - [x] Si oui, marquer l'import_activity comme `imported` avec reference a la session existante
- [x] Task 3 : Protection des modifications locales (AC: #4)
  - [x] Aucun mecanisme de sync retour
  - [x] Les donnees importees sont un snapshot, modifiable localement

## Dev Notes

### Cascade FK

La FK `import_activities.connector_id -> connectors.id` doit avoir `ON DELETE CASCADE` pour nettoyer automatiquement les entrees staging quand un connecteur est supprime. Les sessions (via `imported_session_id`) ne doivent PAS etre affectees — cette FK est nullable et sans cascade.

### One-way snapshot

Le design est deliberement unidirectionnel : Strava -> Sporty, jamais l'inverse. Une fois importee, une seance est 100% locale.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 10.3]

## Dev Agent Record

### File List

- `app/domain/interfaces/session_repository.ts` — méthode `findByUserAndExternalIds()` ajoutée
- `app/domain/interfaces/import_activity_repository.ts` — méthode `markImportedBulk()` ajoutée
- `app/repositories/lucid_session_repository.ts` — implémentation `findByUserAndExternalIds()`
- `app/repositories/lucid_import_activity_repository.ts` — implémentation `markImportedBulk()`
- `app/use_cases/import/list_pre_import_activities.ts` — détection doublons par external_id au staging (AC#3)
- `tests/functional/connectors/strava_disconnect.spec.ts` — test isolation sessions au disconnect (AC#1, #2)
- `tests/unit/use_cases/import/list_pre_import_activities.spec.ts` — tests déduplication AC#3
- `tests/helpers/mock_session_repository.ts` — méthode mock ajoutée

### Completion Notes

- Task 1 (isolation disconnect) : les sessions n'ont pas de FK vers connectors — suppression connecteur ne cascade pas sur sessions. Vérifié par test fonctionnel : session avec `imported_from='strava'` reste intacte après disconnect.
- Task 2 (déduplication) : `ListPreImportActivities` appelle `sessionRepository.findByUserAndExternalIds()` puis `markImportedBulk()` pour marquer les activités déjà importées comme `imported` avec leur `session_id`. Testé en unitaire.
- Task 3 (one-way snapshot) : implémenté par design — aucun mécanisme de sync retour vers Strava n'existe. Les données importées sont 100% locales et modifiables.

### Change Log

- Implémentation stories 10.1, 10.2, 10.3 (2026-03-15)
