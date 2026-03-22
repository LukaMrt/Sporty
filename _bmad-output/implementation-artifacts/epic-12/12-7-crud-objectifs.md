# Story 12.7 : CRUD Objectifs (TrainingGoal)

Status: pending

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

- [ ] Task 1 : Use cases (AC: #1-#5)
  - [ ] Creer `app/use_cases/planning/create_goal.ts` — verifie pas d'objectif actif, cree, met trainingState a 'preparation'
  - [ ] Creer `app/use_cases/planning/update_goal.ts`
  - [ ] Creer `app/use_cases/planning/abandon_goal.ts` — abandonne objectif + plan associe, remet trainingState a 'idle'
- [ ] Task 2 : Validators (AC: #1)
  - [ ] Creer `app/validators/planning/goal_validator.ts`
  - [ ] distance : number > 0, obligatoire
  - [ ] targetTimeMinutes : number > 0, optionnel
  - [ ] eventDate : date future, optionnel
- [ ] Task 3 : Controller (AC: #1-#5)
  - [ ] Creer `app/controllers/planning/goals_controller.ts`
  - [ ] `create()` → page formulaire (ou partie du wizard)
  - [ ] `store()` → validation + use case CreateGoal
  - [ ] `update()` → validation + use case UpdateGoal
  - [ ] `abandon()` → use case AbandonGoal
- [ ] Task 4 : Routes
  - [ ] Ajouter dans `start/routes.ts` les routes goals

## Dev Notes

### Un seul objectif actif

Le use case `CreateGoal` verifie via `TrainingGoalRepository.findActiveByUserId()` qu'il n'y a pas d'objectif actif. Si un objectif actif existe, l'utilisateur doit d'abord l'abandonner.

### Le controller est thin

Validation → use case → response. Le controller ne contient aucune logique metier.

### References

- [Architecture section 7.1](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#7)
- [PRD FR11](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
