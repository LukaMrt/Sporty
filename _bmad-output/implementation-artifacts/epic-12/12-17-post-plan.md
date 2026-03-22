# Story 12.17 : Post-plan — Transition & maintien

Status: pending

## Story

As a **coureur**,
I want **recevoir des propositions a la fin de mon plan (transition, maintien, nouvel objectif)**,
So that **je continue a progresser sans interruption**.

## Acceptance Criteria

1. **Given** mon plan atteint son terme **When** je consulte `/planning` **Then** un ecran de propositions remplace le contenu : transition / maintien / nouvel objectif / plus tard
2. **Given** je choisis "Transition" **When** le plan est genere **Then** un plan de 2-4 semaines post-course est cree (volume 60-70%, intensite moderee) et le trainingState passe a 'transition'
3. **Given** la duree de transition **When** elle est calculee **Then** elle depend de la distance courue (2 sem ≤ 10K, 3 sem semi, 4 sem marathon)
4. **Given** la transition est terminee **When** je consulte `/planning` **Then** les memes propositions sont affichees (maintien, nouvel objectif)
5. **Given** je choisis "Maintien" **When** le plan est genere **Then** un plan en cycles 4-Week (3 sem charge + 1 allegee) est cree avec 30-40% du volume pic et le trainingState passe a 'maintenance'
6. **Given** le plan de maintien est actif **When** le cycle de 4 semaines se termine **Then** un nouveau cycle identique est genere automatiquement (boucle)
7. **Given** je choisis "Nouvel objectif" **When** le flow se declenche **Then** je suis redirige vers le wizard Goal Setting
8. **Given** je choisis "Plus tard" **When** je reviens sur `/planning` **Then** l'etat vide est affiche avec CTA

## Tasks / Subtasks

- [ ] Task 1 : Use cases (AC: #2, #5, #6)
  - [ ] Creer `app/use_cases/planning/generate_transition_plan.ts`
  - [ ] Creer `app/use_cases/planning/generate_maintenance_plan.ts`
  - [ ] Creer `app/use_cases/planning/abandon_plan.ts`
  - [ ] Gestion trainingState dans chaque use case
- [ ] Task 2 : Controller routes (AC: #1, #7, #8)
  - [ ] `PlanningController.generateTransition()` → `POST /planning/transition`
  - [ ] `PlanningController.generateMaintenance()` → `POST /planning/maintenance`
  - [ ] `PlanningController.abandon()` → `POST /planning/abandon`
- [ ] Task 3 : UI — Ecran post-plan (AC: #1, #4)
  - [ ] Creer `inertia/components/planning/PostPlanProposal.tsx`
  - [ ] 3 options (transition / maintien / nouvel objectif) + "Plus tard"
  - [ ] Affiche dans `/planning` quand le plan est 'completed'
- [ ] Task 4 : Boucle maintien (AC: #6)
  - [ ] Detection fin de cycle maintien dans GetPlanOverview
  - [ ] Regeneration auto d'un nouveau cycle via DanielsPlanEngine.generateMaintenancePlan()

## Dev Notes

### Modele d'etats de l'athlete

```
IDLE → PREPARATION    (objectif defini)
PREPARATION → fin     (plan termine / course terminee)
fin → TRANSITION      (utilisateur accepte la transition)
TRANSITION → MAINTENANCE  (recuperation finie)
MAINTENANCE → PREPARATION (nouvel objectif)
```

Toutes les transitions sont proposees par le systeme et decidees par l'utilisateur. Pas de transition automatique.

### Plan de maintien — Daniels cycles 4-Week

- 3 semaines charge + 1 allegee
- 2 seances structurees/semaine + 1 easy
- Volume : 30-40% du volume pic du plan precedent
- Allures basees sur VDOT actuel

### References

- [UX Design section 8.2](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#8)
- [PRD FR40-FR46](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
- Hickson (1985), Daniels (2022)
