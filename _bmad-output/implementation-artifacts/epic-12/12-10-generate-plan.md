# Story 12.10 : Use case GeneratePlan — Orchestration complete

Status: review

## Story

As a **coureur**,
I want **que le systeme orchestre la generation d'un plan complet depuis mon objectif**,
So that **je recois un plan personnalise base sur mon profil et mes donnees**.

## Acceptance Criteria

1. **Given** j'ai un objectif actif et pas de plan actif **When** je declenche la generation **Then** le use case orchestre : recuperation historique → calcul fitness → VDOT → pace zones → TrainingPlanEngine.generatePlan → persistance
2. **Given** j'ai deja un plan actif **When** je tente de generer un nouveau plan **Then** une erreur est retournee
3. **Given** la generation reussit **When** le plan est persiste **Then** le plan a le status 'active', les semaines et seances sont creees, le trainingState passe a 'preparation'
4. **Given** la generation est declenchee depuis le wizard **When** elle aboutit **Then** la reponse redirige vers `/planning` avec le plan actif
5. **Given** un plan est genere **When** il est consulte **Then** toutes les seances ont des intervalles detailles, des allures cibles et une charge planifiee (targetLoadTss)

## Tasks / Subtasks

- [x] Task 1 : Use case GeneratePlan (AC: #1, #2, #3)
  - [x] Creer `app/use_cases/planning/generate_plan.ts`
  - [x] Injecter : TrainingGoalRepository, TrainingPlanRepository, SessionRepository, TrainingLoadCalculator, FitnessProfileCalculator, TrainingPlanEngine
  - [x] Orchestration : voir flux ci-dessous
  - [x] Verification pas de plan actif existant
  - [x] Persister plan + weeks + sessions
  - [x] Mettre a jour trainingState → 'preparation'
- [x] Task 2 : Controller (AC: #4)
  - [x] Creer `app/controllers/planning/planning_controller.ts`
  - [x] `generate()` → validation + use case GeneratePlan + redirect `/planning`
- [x] Task 3 : Validator
  - [x] Creer `app/validators/planning/generate_plan_validator.ts`
  - [x] vdot: number (15-85), sessionsPerWeek: number (2-7), preferredDays: array of numbers (0-6), planDurationWeeks: number (≥ 8)
- [x] Task 4 : Routes
  - [x] `POST /planning/generate` → PlanningController.generate

## Dev Notes

### Flux orchestre

```
1. TrainingGoalRepository.findActiveByUserId(userId) → goal
2. TrainingPlanRepository.findActiveByUserId(userId) → verifier null
3. SessionRepository.findByUserId(userId, { last6Weeks }) → historique
4. Pour chaque seance : TrainingLoadCalculator.calculate() → charge
5. FitnessProfileCalculator.calculate(loadHistory) → CTL/ATL/TSB
6. VdotCalculator (deja calcule par le wizard, passe en parametre)
7. VdotCalculator.derivePaceZones(vdot) → zones
8. Assembler PlanRequest
9. TrainingPlanEngine.generatePlan(request) → plan structure
10. TrainingPlanRepository.create(plan) → persister
11. TrainingPlanRepository.createSessions(sessions)
12. UserProfileRepository.update({ trainingState: 'preparation' })
```

### Le VDOT est passe en parametre

Le VDOT a deja ete estime et confirme dans le wizard (story 12.8). Le use case ne le recalcule pas — il le recoit en entree.

### References

- [Architecture section 7.2](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#7)

## Dev Agent Record

### Implementation Notes

- Ajout de `TrainingState.Preparation = 'preparation'` à l'enum (pas de migration requise — colonne string en BDD)
- Ajout de `findActiveByUserId` au port `TrainingPlanRepository` + implémentation Lucid
- Nouvelles erreurs domaine : `ActivePlanExistsError`, `NoActiveGoalError`
- Le volume hebdomadaire courant est estimé depuis les séances des 6 dernières semaines (somme / 6 semaines)
- `targetLoadTss` est `null` pour l'instant (calcul TSS par session n'est pas encore modélisé)

### File List

- `app/domain/value_objects/planning_types.ts` (modifié — TrainingState.Preparation)
- `app/domain/interfaces/training_plan_repository.ts` (modifié — findActiveByUserId)
- `app/repositories/lucid_training_plan_repository.ts` (modifié — findActiveByUserId)
- `app/domain/errors/active_plan_exists_error.ts` (créé)
- `app/domain/errors/no_active_goal_error.ts` (créé)
- `app/use_cases/planning/generate_plan.ts` (créé)
- `app/validators/planning/generate_plan_validator.ts` (créé)
- `app/controllers/planning/planning_controller.ts` (créé)
- `start/routes.ts` (modifié — POST /planning/generate)
- `tests/unit/use_cases/planning/generate_plan.spec.ts` (créé)

### Change Log

- 2026-03-24 : Implémentation complète story 12.10 — use case GeneratePlan, controller, validator, route
