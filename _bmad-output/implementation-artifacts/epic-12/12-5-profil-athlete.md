# Story 12.5 : Profil athlete — Page & estimation VDOT (UI)

Status: pending

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

- [ ] Task 1 : Use case EstimateVdot (AC: prerequis)
  - [ ] Creer `app/use_cases/planning/estimate_vdot.ts`
  - [ ] Entonnoir : historique Strava → temps recent → VMA → questionnaire
  - [ ] Retourne VDOT estime + methode utilisee + pace zones
- [ ] Task 2 : Controller & routes (AC: #1, #3, #4)
  - [ ] Creer `app/controllers/planning/athlete_profile_controller.ts`
  - [ ] `show()` → page profil athlete (VDOT, zones, etat, infos perso)
  - [ ] `estimateVdot()` → appel use case
  - [ ] `confirmVdot()` → persister le VDOT confirme
  - [ ] Routes dans `start/routes.ts`
- [ ] Task 3 : Validator (AC: #4)
  - [ ] Creer `app/validators/planning/athlete_profile_validator.ts`
  - [ ] Validation sexe, VDOT (range 15-85)
- [ ] Task 4 : Page React AthleteProfile (AC: #1-#7)
  - [ ] Creer `inertia/pages/Planning/AthleteProfile.tsx`
  - [ ] Section VDOT avec bouton Modifier → slider inline
  - [ ] Section zones d'allure (composant `PaceZonesDisplay`)
  - [ ] Section etat d'entrainement
  - [ ] Section donnees techniques (conditionnel toggle)
  - [ ] Section informations personnelles (sexe, FC max, FC repos, VMA)
- [ ] Task 5 : Composants planning (AC: #1, #5)
  - [ ] Creer `inertia/components/planning/PaceZonesDisplay.tsx`
  - [ ] Creer `inertia/components/planning/FitnessMetrics.tsx` (CTL/ATL/TSB/ACWR)

## Dev Notes

### Labels d'etat d'entrainement

| trainingState | Label |
|---------------|-------|
| idle | Pas de plan en cours |
| preparation | En preparation |
| transition | En transition |
| maintenance | En maintien |

### Le VDOT n'est pas stocke sur le profil utilisateur

Le VDOT est stocke sur le `TrainingPlan` (`vdotAtCreation`, `currentVdot`). Pour l'affichage profil sans plan actif, on le recalcule a la demande ou on affiche la derniere valeur connue depuis le dernier plan.

### Toggle donnees techniques

Preference utilisateur stockee en localStorage (pas en BDD) — concerne uniquement l'affichage.

### References

- [UX Design section 6](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#6)
- [Architecture section 7.1 — EstimateVdot](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#7)
