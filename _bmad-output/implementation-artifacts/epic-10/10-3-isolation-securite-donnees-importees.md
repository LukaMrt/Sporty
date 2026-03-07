# Story 10.3 : Isolation et securite des donnees importees

Status: draft

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

- [ ] Task 1 : Verifier isolation au disconnect (AC: #1, #2)
  - [ ] La deconnexion ne supprime pas les sessions
  - [ ] Nettoyage des import_activities (cascade ou explicite)
- [ ] Task 2 : Detection doublons a la reconnexion (AC: #3)
  - [ ] Lors du staging, verifier si une session avec le meme `external_id` existe
  - [ ] Si oui, marquer l'import_activity comme `imported` avec reference a la session existante
- [ ] Task 3 : Protection des modifications locales (AC: #4)
  - [ ] Aucun mecanisme de sync retour
  - [ ] Les donnees importees sont un snapshot, modifiable localement

## Dev Notes

### Cascade FK

La FK `import_activities.connector_id -> connectors.id` doit avoir `ON DELETE CASCADE` pour nettoyer automatiquement les entrees staging quand un connecteur est supprime. Les sessions (via `imported_session_id`) ne doivent PAS etre affectees — cette FK est nullable et sans cascade.

### One-way snapshot

Le design est deliberement unidirectionnel : Strava -> Sporty, jamais l'inverse. Une fois importee, une seance est 100% locale.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 10.3]
