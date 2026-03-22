# Story 12.1 : Prerequis techniques — Migration typage sportMetrics & event system

Status: pending

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

- [ ] Task 1 : Value object SportMetrics (AC: #1)
  - [ ] Creer `app/domain/value_objects/sport_metrics.ts`
  - [ ] Exporter `SportMetrics` (type union) et `isRunMetrics()` (type guard)
- [ ] Task 2 : Migration typage sportMetrics (AC: #2, #3)
  - [ ] `domain/entities/training_session.ts` → `sportMetrics: SportMetrics`
  - [ ] `domain/interfaces/connector.ts` → `MappedSessionData.sportMetrics: SportMetrics`
  - [ ] `models/session.ts` → `sportMetrics: SportMetrics`
  - [ ] `use_cases/sessions/create_session.ts` → supprimer casts
  - [ ] `use_cases/sessions/update_session.ts` → supprimer casts
  - [ ] `use_cases/sessions/enrich_session_with_gpx.ts` → supprimer casts
  - [ ] `controllers/sessions/sessions_controller.ts` → supprimer casts
  - [ ] `connectors/strava/strava_connector.ts` → typage `RunMetrics`
  - [ ] `inertia/pages/Sessions/Show.tsx` → importer `RunMetrics` au lieu du type local
- [ ] Task 3 : Migration profil (AC: #4, #5)
  - [ ] `node ace make:migration add_planning_fields_to_user_profiles`
  - [ ] Ajouter `sex` varchar nullable
  - [ ] Ajouter `training_state` varchar NOT NULL DEFAULT 'idle'
  - [ ] Mettre a jour modele Lucid `UserProfile`
  - [ ] Mettre a jour entite domain `UserProfile`
- [ ] Task 4 : Types planning partages (AC: prerequis)
  - [ ] Creer `app/domain/value_objects/planning_types.ts` avec tous les types enumeres du module planning (TrainingMethodology, BiologicalSex, TrainingState, PlanType, PlanStatus, GoalStatus, SessionType, IntensityZone, PlannedSessionStatus, IntervalBlockType, LoadMethod)
- [ ] Task 5 : Event system (AC: #6, #7)
  - [ ] Declarer `session:completed` dans `start/events.ts`
  - [ ] Emettre dans `CreateSession` use case
  - [ ] Emettre dans `ImportSessions` use case
  - [ ] Emettre dans `SyncConnector` use case

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
