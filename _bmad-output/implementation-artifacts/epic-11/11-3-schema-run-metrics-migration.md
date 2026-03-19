# Story 11.3 : Schema RunMetrics & migration

Status: done

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

- [x] Task 1 : Value objects domain (AC: #1)
  - [x] Creer `app/domain/value_objects/run_metrics.ts`
  - [x] Interface `DataPoint` : `{ time: number; value: number }`
  - [x] Interface `GpsPoint` : `{ lat: number; lon: number; ele?: number; time: number }`
  - [x] Interface `KmSplit` : `{ km: number; paceSeconds: number; avgHeartRate?: number; elevationGain?: number }`
  - [x] Interface `HeartRateZones` : `{ z1: number; z2: number; z3: number; z4: number; z5: number }` (% temps)
  - [x] Interface `RunMetrics` avec metriques de base, GPX et calculees
- [x] Task 2 : Migration user_profiles (AC: #2)
  - [x] `node ace make:migration add_physiology_to_user_profiles`
  - [x] Ajouter `max_heart_rate` integer nullable
  - [x] Ajouter `vma` float nullable
- [x] Task 3 : Migration sessions (AC: #3)
  - [x] `node ace make:migration add_gpx_file_path_to_sessions`
  - [x] Ajouter `gpx_file_path` string nullable
- [x] Task 4 : Mise a jour modeles Lucid (AC: #4, #5)
  - [x] `UserProfile` : ajouter `maxHeartRate` et `vma`
  - [x] `Session` : ajouter `gpxFilePath`
- [x] Task 5 : Mise a jour entites domain (AC: #6)
  - [x] `UserProfile` : ajouter `maxHeartRate?: number` et `vma?: number`
  - [x] `TrainingSession` : ajouter `gpxFilePath?: string | null`

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

## Dev Agent Record

### Implementation Plan

- Task 1 : Création de `app/domain/value_objects/run_metrics.ts` avec les 5 interfaces (DataPoint, GpsPoint, KmSplit, HeartRateZones, RunMetrics)
- Tasks 2, 4 (UserProfile), 5 (UserProfile) : déjà implémentés dans la story 11.1 (migration + modèle Lucid + entité domain)
- Task 3 : Création de la migration `1772000000005_add_gpx_file_path_to_sessions.ts`
- Task 4 (Session) : Ajout de `gpxFilePath` dans le modèle Lucid `Session`
- Task 5 (TrainingSession) : Ajout de `gpxFilePath?: string | null` dans l'entité domain

### Completion Notes

Tous les ACs sont satisfaits. Les Tasks 2, 4 (UserProfile) et 5 (UserProfile) étaient déjà présents suite à l'implémentation de la story 11.1. Cette story complète la base de données et les types domain pour la colonne `gpx_file_path` et le schema `RunMetrics`.

## File List

- `app/domain/value_objects/run_metrics.ts` (créé)
- `database/migrations/1772000000005_add_gpx_file_path_to_sessions.ts` (créé)
- `app/models/session.ts` (modifié)
- `app/domain/entities/training_session.ts` (modifié)

## Change Log

- 2026-03-17 : Implémentation story 11.3 — value objects RunMetrics, migration gpx_file_path, mise à jour Session
