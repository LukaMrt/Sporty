# Story 12.10 : Use case GeneratePlan — Orchestration complete

Status: pending

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

- [ ] Task 1 : Use case GeneratePlan (AC: #1, #2, #3)
  - [ ] Creer `app/use_cases/planning/generate_plan.ts`
  - [ ] Injecter : TrainingGoalRepository, TrainingPlanRepository, SessionRepository, TrainingLoadCalculator, FitnessProfileCalculator, TrainingPlanEngine
  - [ ] Orchestration : voir flux ci-dessous
  - [ ] Verification pas de plan actif existant
  - [ ] Persister plan + weeks + sessions
  - [ ] Mettre a jour trainingState → 'preparation'
- [ ] Task 2 : Controller (AC: #4)
  - [ ] Creer `app/controllers/planning/planning_controller.ts`
  - [ ] `generate()` → validation + use case GeneratePlan + redirect `/planning`
- [ ] Task 3 : Validator
  - [ ] Creer `app/validators/planning/generate_plan_validator.ts`
  - [ ] vdot: number (15-85), sessionsPerWeek: number (2-7), preferredDays: array of numbers (0-6), planDurationWeeks: number (≥ 8)
- [ ] Task 4 : Routes
  - [ ] `POST /planning/generate` → PlanningController.generate

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
