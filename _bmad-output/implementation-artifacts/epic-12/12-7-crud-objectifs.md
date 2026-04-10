# Story 12.7 : CRUD Objectifs (TrainingGoal)

Status: review

## Story

As a **coureur**,
I want **creer, modifier et abandonner un objectif de course**,
So that **je peux definir ce vers quoi je veux progresser**.

## Acceptance Criteria

1. **Given** je suis connecte **When** je cree un objectif avec distance (obligatoire), temps cible (optionnel), date (optionnelle) **Then** l'objectif est persiste avec status 'active'
2. **Given** j'ai deja un objectif actif **When** je tente d'en creer un autre **Then** une erreur est retournee ("Un seul objectif actif a la fois")
3. **Given** j'ai un objectif actif **When** je le modifie **Then** les champs sont mis a jour
4. **Given** j'ai un objectif actif avec un plan associe **When** je l'abandonne **Then** l'objectif passe a 'abandoned' et le plan associe aussi
5. **Given** j'abandonne un objectif **When** le trainingState est mis a jour **Then** il repasse a 'idle'

## Tasks / Subtasks

- [x] Task 1 : Use cases (AC: #1-#5)
  - [x] Creer `app/use_cases/planning/create_goal.ts` — verifie pas d'objectif actif, cree, met trainingState a 'preparation'
  - [x] Creer `app/use_cases/planning/update_goal.ts`
  - [x] Creer `app/use_cases/planning/abandon_goal.ts` — abandonne objectif + plan associe, remet trainingState a 'idle'
- [x] Task 2 : Validators (AC: #1)
  - [x] Creer `app/validators/planning/goal_validator.ts`
  - [x] distance : number > 0, obligatoire
  - [x] targetTimeMinutes : number > 0, optionnel
  - [x] eventDate : date future, optionnel
- [x] Task 3 : Controller (AC: #1-#5)
  - [x] Creer `app/controllers/planning/goals_controller.ts`
  - [x] `store()` → validation + use case CreateGoal
  - [x] `update()` → validation + use case UpdateGoal
  - [x] `abandon()` → use case AbandonGoal
- [x] Task 4 : Routes
  - [x] Ajouter dans `start/routes.ts` les routes goals

## Dev Notes

### Un seul objectif actif

Le use case `CreateGoal` verifie via `TrainingGoalRepository.findActiveByUserId()` qu'il n'y a pas d'objectif actif. Si un objectif actif existe, l'utilisateur doit d'abord l'abandonner.

### Le controller est thin

Validation → use case → response. Le controller ne contient aucune logique metier.

### References

- [Architecture section 7.1](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#7)
- [PRD FR11](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)

## Dev Agent Record

### File List

- `app/domain/errors/active_goal_exists_error.ts` — nouvelle erreur métier
- `app/domain/interfaces/training_goal_repository.ts` — ajout `findActiveByUserId()`
- `app/domain/interfaces/training_plan_repository.ts` — ajout `findActiveByGoalId()`
- `app/repositories/lucid_training_goal_repository.ts` — implémentation `findActiveByUserId()`
- `app/repositories/lucid_training_plan_repository.ts` — implémentation `findActiveByGoalId()`
- `app/use_cases/planning/create_goal.ts` — nouveau use case
- `app/use_cases/planning/update_goal.ts` — nouveau use case
- `app/use_cases/planning/abandon_goal.ts` — nouveau use case
- `app/validators/planning/goal_validator.ts` — validators VineJS
- `app/controllers/planning/goals_controller.ts` — controller thin
- `start/routes.ts` — 3 routes goals ajoutées
- `tests/functional/planning/goals.spec.ts` — 7 tests fonctionnels

### Completion Notes

Tous les ACs couverts. Extension des deux ports de repositories pour supporter les opérations nécessaires aux use cases. Le plan associé à un objectif abandonné passe à 'archived' (la valeur disponible la plus proche de 'abandoned' dans PlanStatus). trainingState utilise `TrainingState.InPlan` à la création et `TrainingState.Idle` à l'abandon.

### Change Log

- 2026-03-23 : Implémentation complète story 12.7 — CRUD objectifs TrainingGoal
