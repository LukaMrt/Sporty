# Story 11.3 : Schema RunMetrics & migration

Status: pending

## Story

As a **dev (Luka)**,
I want **standardiser le schema `RunMetrics` dans le domain et migrer les colonnes necessaires**,
so that **toutes les donnees de course suivent un format previsible et les parametres physiologiques sont stockes**.

## Acceptance Criteria

1. **Given** le fichier `app/domain/value_objects/run_metrics.ts` **When** il est cree **Then** il exporte `RunMetrics`, `KmSplit`, `DataPoint`, `GpsPoint`, `HeartRateZones` avec tous les champs documentes
2. **Given** la migration profil **When** `node ace migration:run` est execute **Then** les colonnes `max_heart_rate` (integer, nullable) et `vma` (float, nullable) existent sur `user_profiles`
3. **Given** la migration sessions **When** `node ace migration:run` est execute **Then** la colonne `gpx_file_path` (string, nullable) existe sur `sessions`
4. **Given** le modele Lucid `UserProfile` **When** il est mis a jour **Then** il declare `maxHeartRate` et `vma`
5. **Given** le modele Lucid `Session` **When** il est mis a jour **Then** il declare `gpxFilePath`
6. **Given** l'entite domain `UserProfile` **When** elle est mise a jour **Then** elle inclut `maxHeartRate?: number` et `vma?: number`

## Tasks / Subtasks

- [ ] Task 1 : Value objects domain (AC: #1)
  - [ ] Creer `app/domain/value_objects/run_metrics.ts`
  - [ ] Interface `DataPoint` : `{ time: number; value: number }`
  - [ ] Interface `GpsPoint` : `{ lat: number; lon: number; ele?: number; time: number }`
  - [ ] Interface `KmSplit` : `{ km: number; paceSeconds: number; avgHeartRate?: number; elevationGain?: number }`
  - [ ] Interface `HeartRateZones` : `{ z1: number; z2: number; z3: number; z4: number; z5: number }` (% temps)
  - [ ] Interface `RunMetrics` avec metriques de base, GPX et calculees
- [ ] Task 2 : Migration user_profiles (AC: #2)
  - [ ] `node ace make:migration add_physiology_to_user_profiles`
  - [ ] Ajouter `max_heart_rate` integer nullable
  - [ ] Ajouter `vma` float nullable
- [ ] Task 3 : Migration sessions (AC: #3)
  - [ ] `node ace make:migration add_gpx_file_path_to_sessions`
  - [ ] Ajouter `gpx_file_path` string nullable
- [ ] Task 4 : Mise a jour modeles Lucid (AC: #4, #5)
  - [ ] `UserProfile` : ajouter `maxHeartRate` et `vma`
  - [ ] `Session` : ajouter `gpxFilePath`
- [ ] Task 5 : Mise a jour entites domain (AC: #6)
  - [ ] `UserProfile` : ajouter `maxHeartRate?: number` et `vma?: number`
  - [ ] `TrainingSession` : ajouter `gpxFilePath?: string | null`

## Dev Notes

### Schema RunMetrics complet

```typescript
export interface RunMetrics {
  // Metriques de base enrichies (saisie manuelle ou GPX)
  minHeartRate?: number
  maxHeartRate?: number
  cadenceAvg?: number
  elevationGain?: number
  elevationLoss?: number

  // Depuis GPX — donnees echantillonnees toutes les 15s
  splits?: KmSplit[]
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
  gpsTrack?: GpsPoint[]

  // Calculees (Story 11.7)
  hrZones?: HeartRateZones
  cardiacDrift?: number
  trimp?: number
  avgPacePerKm?: string
}
```

### Compatibilite

`sportMetrics` reste `Record<string, unknown>` au niveau Lucid — le typage `RunMetrics` est applique au niveau domain/use case. Les seances existantes continuent de fonctionner sans modification.

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.3]
- Entite existante : `app/domain/entities/training_session.ts`
- Modele existant : `app/models/session.ts`
