# Story 12.2 : VdotCalculator — Service domaine pur

Status: pending

## Story

As a **coureur**,
I want **que le systeme calcule mon VDOT depuis differentes sources (performance, VMA, historique Strava, questionnaire)**,
So that **mon niveau est estime avec precision pour generer un plan adapte**.

## Acceptance Criteria

1. **Given** une distance (m) et duree (min) **When** `calculateVdot()` est appele **Then** le VDOT retourne correspond aux tables Daniels (erreur < 1%)
2. **Given** un VDOT **When** `derivePaceZones()` est appele **Then** les 5 zones d'allure (E, M, T, I, R) sont retournees en min/km et km/h
3. **Given** une VMA en km/h **When** `vdotFromVma()` est appele **Then** un VDOT coherent est retourne
4. **Given** un historique de seances (≥ 3 eligibles) **When** `vdotFromHistory()` est appele **Then** le VDOT est estime au 90e percentile des performances
5. **Given** un historique insuffisant (< 3 seances) **When** `vdotFromHistory()` est appele **Then** `null` est retourne
6. **Given** des reponses au questionnaire (frequence, anciennete, distance) **When** `vdotFromQuestionnaire()` est appele **Then** un VDOT conservateur est retourne
7. **Given** les formules Daniels-Gilbert **When** les tests unitaires sont executes **Then** les valeurs de reference sont validees (ex: 5K en 20:00 → VDOT ~44.7)

## Tasks / Subtasks

- [ ] Task 1 : Value object PaceZones (AC: #2)
  - [ ] Creer `app/domain/value_objects/pace_zones.ts`
  - [ ] Interface `PaceZoneRange` : `{ minPacePerKm, maxPacePerKm, speedKmh: { min, max } }`
  - [ ] Interface `PaceZones` : `{ easy, marathon, threshold, interval, repetition }`
- [ ] Task 2 : VdotCalculator — fonctions pures (AC: #1, #2, #3, #6)
  - [ ] Creer `app/domain/services/vdot_calculator.ts`
  - [ ] `calculateVdot(distanceMeters, durationMinutes)` → formules Daniels-Gilbert
  - [ ] `derivePaceZones(vdot)` → resolution inverse pour chaque zone
  - [ ] `vdotFromVma(vmaKmh)` → conversion directe
  - [ ] `vdotFromQuestionnaire(frequency, experience, typicalDistance)` → mapping conservateur
- [ ] Task 3 : Estimation depuis historique (AC: #4, #5)
  - [ ] `vdotFromHistory(sessions[])` → filtre running > 3km, allure reguliere, 6 semaines, 90e percentile
- [ ] Task 4 : Tests unitaires (AC: #7)
  - [ ] Tests pour `calculateVdot` avec valeurs de reference Daniels
  - [ ] Tests pour `derivePaceZones` avec VDOT connus
  - [ ] Tests pour `vdotFromVma`
  - [ ] Tests pour `vdotFromQuestionnaire`
  - [ ] Tests pour `vdotFromHistory` (cas nominal + historique insuffisant)

## Dev Notes

### Formules Daniels-Gilbert (1979)

```
VO₂ = -4.60 + 0.182258 × v + 0.000104 × v²        (v = vitesse en m/min)
%VO₂max = 0.8 + 0.1894393 × e^(-0.012778 × t) + 0.2989558 × e^(-0.1932605 × t)   (t = duree en min)
VDOT = VO₂ / %VO₂max
```

### Zones d'allure (% VDOT)

| Zone | % VDOT   |
|------|----------|
| E    | 59-74%   |
| M    | 75-84%   |
| T    | 83-88%   |
| I    | 95-100%  |
| R    | 105-120% |

### Mapping questionnaire → VDOT conservateur

Table de mapping a definir dans le service. Principe : croiser frequence × anciennete × distance pour obtenir un VDOT plancher (ex: debutant total → VDOT 25).

### Ce service est un service domaine pur

Pas un port, pas d'abstract class — ce sont des fonctions pures exportees directement. Zero I/O, zero dependance externe. Le use case les appelle directement.

### References

- [Architecture section 4.1](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#4.1)
- [PRD section Formules cles](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
