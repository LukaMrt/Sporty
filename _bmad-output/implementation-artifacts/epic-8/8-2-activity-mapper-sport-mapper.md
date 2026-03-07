# Story 8.2 : Activity Mapper & Sport Mapper

Status: draft

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

- [ ] Task 1 : StravaSportMapper (AC: #4, #5)
  - [ ] Creer `app/connectors/strava/strava_sport_mapper.ts`
  - [ ] Table de mapping sport_type -> type Sporty
  - [ ] Fallback "autre" pour types inconnus
- [ ] Task 2 : StravaActivityMapper (AC: #1, #2, #3, #6)
  - [ ] Creer `app/connectors/strava/strava_activity_mapper.ts`
  - [ ] Conversions : secondes -> minutes, metres -> km, m/s -> min/km ou km/h
  - [ ] Donnees supplementaires dans sport_metrics JSONB
  - [ ] Gestion des champs null/absents
- [ ] Task 3 : Tests unitaires
  - [ ] Mapper avec activite complete
  - [ ] Mapper avec activite partielle
  - [ ] Sport mapper avec tous les types connus + inconnu

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
