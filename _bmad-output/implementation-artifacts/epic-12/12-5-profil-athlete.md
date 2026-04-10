# Story 12.5 : Profil athlete — Page & estimation VDOT (UI)

Status: review

## Story

As a **coureur**,
I want **consulter mon profil athlete avec VDOT, zones d'allure et etat de forme**,
So that **je comprends mon niveau et les bases de mon plan**.

## Acceptance Criteria

1. **Given** je suis connecte **When** j'accede a `/profile/athlete` **Then** je vois mon VDOT estime, mes zones d'allure et mon etat d'entrainement
2. **Given** je n'ai pas encore de VDOT **When** j'accede a la page **Then** un CTA m'invite a estimer mon niveau
3. **Given** je clique "Modifier" a cote du VDOT **When** le slider apparait **Then** je peux ajuster ±5 et toutes les zones se mettent a jour en temps reel
4. **Given** je renseigne mon sexe **When** je sauvegarde **Then** la valeur est persistee (Homme / Femme / Non renseigne)
5. **Given** le toggle "donnees techniques" est active **When** je consulte la page **Then** je vois CTL, ATL, TSB et ACWR
6. **Given** le toggle est desactive (defaut) **When** je consulte la page **Then** les donnees techniques sont masquees
7. **Given** j'ai un plan actif **When** je consulte la page **Then** je vois l'etat d'entrainement (En preparation, semaine X/Y)

## Tasks / Subtasks

- [x] Task 1 : Use case EstimateVdot (AC: prerequis)
  - [x] Creer `app/use_cases/planning/estimate_vdot.ts`
  - [x] Entonnoir : historique Strava → temps recent → VMA → questionnaire
  - [x] Retourne VDOT estime + methode utilisee + pace zones
- [x] Task 2 : Controller & routes (AC: #1, #3, #4)
  - [x] Creer `app/controllers/planning/athlete_profile_controller.ts`
  - [x] `show()` → page profil athlete (VDOT, zones, etat, infos perso)
  - [x] `estimateVdot()` → appel use case
  - [x] `confirmVdot()` → persister le VDOT confirme (session HTTP)
  - [x] Routes dans `start/routes.ts`
- [x] Task 3 : Validator (AC: #4)
  - [x] Creer `app/validators/planning/athlete_profile_validator.ts`
  - [x] Validation sexe, VDOT (range 15-85)
- [x] Task 4 : Page React AthleteProfile (AC: #1-#7)
  - [x] Creer `inertia/pages/Planning/AthleteProfile.tsx`
  - [x] Section VDOT avec bouton Modifier → slider inline
  - [x] Section zones d'allure (composant `PaceZonesDisplay`)
  - [x] Section etat d'entrainement
  - [x] Section donnees techniques (conditionnel toggle)
  - [x] Section informations personnelles (sexe, FC max, FC repos, VMA)
- [x] Task 5 : Composants planning (AC: #1, #5)
  - [x] Creer `inertia/components/planning/PaceZonesDisplay.tsx`
  - [x] Creer `inertia/components/planning/FitnessMetrics.tsx` (CTL/ATL/TSB/ACWR)

## Dev Notes

### Labels d'etat d'entrainement

| trainingState | Label |
|---------------|-------|
| idle | Pas de plan en cours |
| preparation | En preparation |
| transition | En transition |
| maintenance | En maintien |

### Le VDOT n'est pas stocke sur le profil utilisateur

Le VDOT est stocke sur le `TrainingPlan` (`vdotAtCreation`, `currentVdot`). Pour l'affichage profil sans plan actif, on le recalcule a la demande ou on affiche la derniere valeur connue depuis le dernier plan. En attendant la story 12.6 (schema BDD), le VDOT confirme est stocke en session HTTP (`session.put('confirmedVdot', value)`).

### Toggle donnees techniques

Preference utilisateur stockee en localStorage (pas en BDD) — concerne uniquement l'affichage. Les donnees techniques (CTL/ATL/TSB/ACWR) sont visibles uniquement si `fitnessProfile !== null` (requiert des seances enregistrees).

### Zones d'allure et unite de vitesse

Les zones sont affichees selon la preference `speedUnit` de l'utilisateur (`min_km` ou `km_h`). Les fonctions de conversion `paceToKmh` et `formatPaceMinSec` de `~/lib/format` sont reutilisees.

### References

- [UX Design section 6](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#6)
- [Architecture section 7.1 — EstimateVdot](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#7)

## Dev Agent Record

### Completion Notes

- Use case `EstimateVdot` : entonnoir 3 niveaux (historique sessions → VMA profil → questionnaire). Les sessions sont passees sans `sportType` au filtre `vdotFromHistory` (le filtre distanceKm > 0 est suffisant au niveau use case).
- `confirmVdot()` stocke le VDOT en session HTTP en attendant l'entite `TrainingPlan` (story 12.6+).
- Le composant `PaceZonesDisplay` supporte `min_km` et `km_h`, reutilise `paceToKmh` / `formatPaceMinSec` de `~/lib/format`. En km/h, l'ordre des bornes est inverse (vitesse croissante).
- Lien "Profil athlete" ajoute sur la page `/profile`.
- Page enregistree dans `.adonisjs/server/pages.d.ts`.

## File List

- `app/use_cases/planning/estimate_vdot.ts` (new)
- `app/controllers/planning/athlete_profile_controller.ts` (new)
- `app/validators/planning/athlete_profile_validator.ts` (new)
- `inertia/pages/Planning/AthleteProfile.tsx` (new)
- `inertia/components/planning/PaceZonesDisplay.tsx` (new)
- `inertia/components/planning/FitnessMetrics.tsx` (new)
- `start/routes.ts` (modified)
- `inertia/pages/Profile/Edit.tsx` (modified)
- `.adonisjs/server/pages.d.ts` (modified)
- `tests/unit/use_cases/planning/estimate_vdot.spec.ts` (new)
- `tests/functional/planning/athlete_profile.spec.ts` (new)

## Change Log

- 2026-03-23 : Implementation complete — use case EstimateVdot, controller, validator, page React, composants PaceZonesDisplay et FitnessMetrics, tests unitaires et fonctionnels.
