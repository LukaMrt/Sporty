# Story 12.1 : Prerequis techniques — Migration typage sportMetrics & event system

Status: review

## Story

As a **dev (Luka)**,
I want **migrer le typage sportMetrics vers un type union, ajouter les champs profil, et declarer le systeme d'evenements**,
So that **le module planning dispose des fondations techniques necessaires**.

## Acceptance Criteria

1. **Given** le fichier `app/domain/value_objects/sport_metrics.ts` **When** il est cree **Then** il exporte `SportMetrics = RunMetrics | Record<string, unknown>` et un type guard `isRunMetrics()`
2. **Given** l'entite `TrainingSession` **When** son typage est mis a jour **Then** `sportMetrics` est type `SportMetrics` au lieu de `Record<string, unknown>`
3. **Given** les fichiers impactes (connector, controller, use cases) **When** ils sont mis a jour **Then** les casts `as Record<string, unknown>` et `as DataPoint[]` sont remplaces par le typage natif
4. **Given** la migration profil **When** `node ace migration:run` **Then** les colonnes `sex` (varchar, nullable) et `training_state` (varchar, default 'idle') existent sur `user_profiles`
5. **Given** l'entite domain `UserProfile` **When** elle est mise a jour **Then** elle inclut `sex: BiologicalSex | null` et `trainingState: TrainingState`
6. **Given** le fichier `start/events.ts` **When** il est cree/modifie **Then** l'event `session:completed` est declare avec payload `{ sessionId: number; userId: number }`
7. **Given** les use cases `CreateSession`, `ImportSessions`, `SyncConnector` **When** une seance est creee/importee **Then** l'event `session:completed` est emis

## Tasks / Subtasks

- [x] Task 1 : Value object SportMetrics (AC: #1)
  - [x] Creer `app/domain/value_objects/sport_metrics.ts`
  - [x] Exporter `SportMetrics` (type union) et `isRunMetrics()` (type guard)
- [x] Task 2 : Migration typage sportMetrics (AC: #2, #3)
  - [x] `domain/entities/training_session.ts` → `sportMetrics: SportMetrics`
  - [x] `domain/interfaces/connector.ts` → `MappedSessionData.sportMetrics: SportMetrics`
  - [x] `models/session.ts` → `sportMetrics: SportMetrics`
  - [x] `use_cases/sessions/create_session.ts` → supprimer casts
  - [x] `use_cases/sessions/update_session.ts` → supprimer casts
  - [x] `use_cases/sessions/enrich_session_with_gpx.ts` → supprimer casts
  - [x] `controllers/sessions/sessions_controller.ts` → supprimer casts
  - [x] `connectors/strava/strava_connector.ts` → typage `RunMetrics`
  - [x] `inertia/pages/Sessions/Show.tsx` → importer `RunMetrics` au lieu du type local
- [x] Task 3 : Migration profil (AC: #4, #5)
  - [x] `node ace make:migration add_planning_fields_to_user_profiles`
  - [x] Ajouter `sex` varchar nullable
  - [x] Ajouter `training_state` varchar NOT NULL DEFAULT 'idle'
  - [x] Mettre a jour modele Lucid `UserProfile`
  - [x] Mettre a jour entite domain `UserProfile`
- [x] Task 4 : Types planning partages (AC: prerequis)
  - [x] Creer `app/domain/value_objects/planning_types.ts` avec tous les types enumeres du module planning (TrainingMethodology, BiologicalSex, TrainingState, PlanType, PlanStatus, GoalStatus, SessionType, IntensityZone, PlannedSessionStatus, IntervalBlockType, LoadMethod)
- [x] Task 5 : Event system (AC: #6, #7)
  - [x] Declarer `session:completed` dans `start/events.ts`
  - [x] Emettre dans `CreateSession` use case
  - [x] Emettre dans `ImportSessions` use case
  - [x] Emettre dans `SyncConnector` use case

## Dev Notes

### Type guard isRunMetrics

```typescript
export function isRunMetrics(metrics: SportMetrics): metrics is RunMetrics {
  return (
    metrics !== null &&
    typeof metrics === 'object' &&
    ('splits' in metrics || 'heartRateCurve' in metrics || 'avgPacePerKm' in metrics)
  )
}
```

### Migration : zero changement runtime

La migration du typage sportMetrics est purement TypeScript — aucun changement de comportement runtime, aucune migration BDD (la colonne `sport_metrics` est un JSONB dont le contenu ne change pas).

### Emission d'event

```typescript
import emitter from '@adonisjs/core/services/emitter'
await emitter.emit('session:completed', { sessionId: session.id, userId: session.userId })
```

### References

- [Architecture section 11](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#11)
- [Architecture section 8](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#8)
- Fichiers impactes : voir architecture section 11.2

## Dev Agent Record

### Implementation Notes

- Task 1 : `sport_metrics.ts` créé avec `SportMetrics = RunMetrics | Record<string, unknown>` et `isRunMetrics()` utilisant les champs discriminants (`splits`, `heartRateCurve`, `avgPacePerKm`).
- Task 2 : Migration purement typesafe — aucun changement runtime. Le cast `as DataPoint[]` dans `create_session.ts` remplacé par `isRunMetrics()` type guard. `strava_connector.ts` : `enriched` typé en `RunMetrics` directement. `Show.tsx` : type local `SportMetricsWithCurves` supprimé, remplacé par `RunMetrics` importé depuis le domaine.
- Task 3 : Migration BDD créée (`1774249632043_alter_user_profiles_table.ts`). Repository `LucidUserProfileRepository` mis à jour pour mapper `sex` et `trainingState`. Tests unitaires mis à jour (`sex: null, trainingState: 'idle'`).
- Task 4 : `planning_types.ts` créé avec 11 enums couvrant tout le module planning.
- Task 5 : `start/events.ts` créé avec augmentation de module `EventsList`. Ajout dans `adonisrc.ts` preloads. Emission dans les 3 use cases après création de session.

## File List

- `app/domain/value_objects/sport_metrics.ts` (created)
- `app/domain/value_objects/planning_types.ts` (created)
- `start/events.ts` (created)
- `database/migrations/1774249632043_alter_user_profiles_table.ts` (created)
- `app/domain/entities/training_session.ts` (modified)
- `app/domain/entities/user_profile.ts` (modified)
- `app/domain/interfaces/connector.ts` (modified)
- `app/models/session.ts` (modified)
- `app/models/user_profile.ts` (modified)
- `app/use_cases/sessions/create_session.ts` (modified)
- `app/use_cases/sessions/update_session.ts` (modified)
- `app/use_cases/import/import_sessions.ts` (modified)
- `app/use_cases/connectors/sync_connector.ts` (modified)
- `app/controllers/sessions/sessions_controller.ts` (modified)
- `app/connectors/strava/strava_connector.ts` (modified)
- `app/repositories/lucid_user_profile_repository.ts` (modified)
- `inertia/pages/Sessions/Show.tsx` (modified)
- `adonisrc.ts` (modified)
- `tests/unit/use_cases/onboarding/complete_onboarding.spec.ts` (modified)
- `tests/unit/use_cases/profile/update_profile.spec.ts` (modified)
- `tests/unit/use_cases/profile/get_profile.spec.ts` (modified)

## Change Log

- 2026-03-23 : Implémentation complète story 12.1 — Migration typage SportMetrics, champs profil BiologicalSex/TrainingState, types planning, event system session:completed
