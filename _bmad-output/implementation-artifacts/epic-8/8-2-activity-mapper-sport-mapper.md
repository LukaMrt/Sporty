# Story 8.2 : Activity Mapper & Sport Mapper

Status: done

## Story

As a **systeme**,
I want **transformer les activites Strava en seances Sporty**,
so that **les donnees importees s'integrent dans le modele existant** (FR18, FR19, FR20).

## Acceptance Criteria

1. **Given** le `StravaActivityMapper` **When** il recoit un DetailedActivity de Strava **Then** il produit un objet compatible Session Sporty avec les mappings : name, sport_type (via sport mapper), start_date_local -> date, moving_time -> duration_minutes, distance -> distance_km, average_heartrate -> avg_heart_rate, average_speed -> allure
2. **Given** le mapper **When** il traite une activite **Then** il stocke `imported_from: 'strava'` et `external_id: activity.id`
3. **Given** le mapper **When** il traite les donnees supplementaires **Then** calories, elevation_gain, max_heartrate, device_name sont stockees dans `sport_metrics` JSONB
4. **Given** le `StravaSportMapper` **When** il recoit un sport_type Strava **Then** il mappe : Run/TrailRun/VirtualRun -> course, Ride/MountainBikeRide/GravelRide/EBikeRide/VirtualRide -> velo, Swim -> natation, Walk -> marche, Hike -> randonnee
5. **Given** un sport_type non mappe **When** le mapper le traite **Then** il retourne "autre" comme fallback
6. **Given** une activite avec donnees partielles (pas de FC, pas de distance) **When** le mapper la traite **Then** les champs manquants sont null, l'import n'est pas bloque

## Tasks / Subtasks

- [x] Task 1 : StravaSportMapper (AC: #4, #5)
  - [x] Creer `app/connectors/strava/strava_sport_mapper.ts`
  - [x] Table de mapping sport_type -> type Sporty
  - [x] Fallback "autre" pour types inconnus
- [x] Task 2 : StravaActivityMapper (AC: #1, #2, #3, #6)
  - [x] Creer `app/connectors/strava/strava_activity_mapper.ts`
  - [x] Conversions : secondes -> minutes, metres -> km, m/s -> min/km ou km/h
  - [x] Donnees supplementaires dans sport_metrics JSONB
  - [x] Gestion des champs null/absents
- [x] Task 3 : Tests unitaires
  - [x] Mapper avec activite complete
  - [x] Mapper avec activite partielle
  - [x] Sport mapper avec tous les types connus + inconnu

## Dev Notes

### Conversions

| Strava | Sporty | Conversion |
|--------|--------|------------|
| moving_time (seconds) | duration_minutes | / 60 |
| distance (meters) | distance_km | / 1000 |
| average_speed (m/s) | allure (min/km) | 1000 / (speed * 60) pour course |
| average_speed (m/s) | allure (km/h) | * 3.6 pour velo |

### Sport type mapping

| Strava sport_type | Sporty type |
|-------------------|-------------|
| Run, TrailRun, VirtualRun | course |
| Ride, MountainBikeRide, GravelRide, EBikeRide, VirtualRide | velo |
| Swim | natation |
| Walk | marche |
| Hike | randonnee |
| * (autre) | autre |

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.2]

## Dev Agent Record

### Implementation Plan

- `StravaSportMapper` : table de mapping statique `Record<string, SportySportSlug>` avec fallback `??` — zéro dépendance externe.
- `StravaActivityMapper` : type intermédiaire `MappedActivity` (sport slug au lieu de sportId) car le mapper n'a pas accès à la DB ; la résolution sportId → use case d'import.
- `allure` stockée dans `sportMetrics` (JSONB) car absent de l'entité `TrainingSession`.
- Conversion `distance` : `=== null || === undefined || <= 0` → `null` (corrigé `!=` → `!==` pour ESLint `eqeqeq`).

### Completion Notes

- 36 tests passent (14 sport mapper + 22 activity mapper).
- CI complète OK (format, lint, typecheck, depcruise, test).
- `allure` velo = speed × 3.6 (km/h) ; course = 1000 / (speed × 60) (min/km).

## File List

- `app/connectors/strava/strava_sport_mapper.ts` (nouveau)
- `app/connectors/strava/strava_activity_mapper.ts` (nouveau)
- `tests/unit/connectors/strava/strava_sport_mapper.spec.ts` (nouveau)
- `tests/unit/connectors/strava/strava_activity_mapper.spec.ts` (nouveau)

## Change Log

- 2026-03-08 : Implémentation Story 8.2 — StravaSportMapper, StravaActivityMapper, 36 tests unitaires. CI verte.
