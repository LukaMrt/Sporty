# Story 12.6 : Schema BDD planning — Goals, Plans, Weeks, Sessions

Status: pending

## Story

As a **dev (Luka)**,
I want **creer les tables training_goals, training_plans, planned_weeks, planned_sessions et les modeles Lucid associes**,
So that **les donnees du module planning sont persistees**.

## Acceptance Criteria

1. **Given** `node ace migration:run` **When** les migrations sont executees **Then** la table `training_goals` existe avec les colonnes : id, user_id, target_distance_km, target_time_minutes (nullable), event_date (nullable), status, created_at, updated_at
2. **Given** la table `training_plans` **When** elle est creee **Then** elle contient : id, user_id, goal_id (nullable FK), methodology, plan_type, status, auto_recalibrate, vdot_at_creation, current_vdot, sessions_per_week, preferred_days (JSONB), start_date, end_date, last_recalibrated_at, created_at, updated_at
3. **Given** la table `planned_weeks` **When** elle est creee **Then** elle contient : id, plan_id (FK), week_number, phase_name, phase_label, is_recovery_week, target_volume_minutes, created_at, updated_at — avec contrainte UNIQUE(plan_id, week_number)
4. **Given** la table `planned_sessions` **When** elle est creee **Then** elle contient : id, plan_id (FK), week_number, day_of_week, session_type, description, target_duration_minutes, target_distance_km (nullable), target_pace_per_km (nullable), intensity_zone, intervals (JSONB, nullable), target_load_tss (nullable), completed_session_id (nullable FK → sessions), status, created_at, updated_at
5. **Given** les modeles Lucid **When** ils sont crees **Then** `TrainingGoalModel`, `TrainingPlanModel`, `PlannedWeekModel`, `PlannedSessionModel` declarent toutes les colonnes avec les bons types
6. **Given** les entites domaine **When** elles sont creees **Then** `TrainingGoal`, `TrainingPlan`, `PlannedWeek`, `PlannedSession`, `IntervalBlock` sont exportees depuis `app/domain/entities/`
7. **Given** les index **When** ils sont crees **Then** des index existent sur (user_id, status) pour goals et plans, (plan_id) pour weeks, (plan_id, week_number) et (completed_session_id) pour sessions

## Tasks / Subtasks

- [ ] Task 1 : Entites domaine (AC: #6)
  - [ ] Creer `app/domain/entities/training_goal.ts`
  - [ ] Creer `app/domain/entities/training_plan.ts`
  - [ ] Creer `app/domain/entities/planned_week.ts`
  - [ ] Creer `app/domain/entities/planned_session.ts` (inclut `IntervalBlock`)
- [ ] Task 2 : Migrations (AC: #1, #2, #3, #4, #7)
  - [ ] `node ace make:migration create_training_goals`
  - [ ] `node ace make:migration create_training_plans`
  - [ ] `node ace make:migration create_planned_weeks`
  - [ ] `node ace make:migration create_planned_sessions`
  - [ ] Ajouter les index
- [ ] Task 3 : Modeles Lucid (AC: #5)
  - [ ] Creer `app/models/training_goal.ts`
  - [ ] Creer `app/models/training_plan.ts`
  - [ ] Creer `app/models/planned_week.ts`
  - [ ] Creer `app/models/planned_session.ts`
  - [ ] Relations : Plan belongsTo Goal, Plan hasMany Weeks, Plan hasMany Sessions, Session belongsTo Plan
- [ ] Task 4 : Ports repositories (AC: prerequis)
  - [ ] Creer `app/domain/interfaces/training_plan_repository.ts`
  - [ ] Creer `app/domain/interfaces/training_goal_repository.ts`
- [ ] Task 5 : Implementations repositories (AC: prerequis)
  - [ ] Creer `app/repositories/lucid_training_plan_repository.ts`
  - [ ] Creer `app/repositories/lucid_training_goal_repository.ts`
  - [ ] Bindings IoC dans `providers/app_provider.ts`

## Dev Notes

### planned_sessions.intervals est un JSONB

Stocke un tableau `IntervalBlock[]`. Pas de table separee pour les intervalles — la granularite est suffisante en JSON et evite des jointures couteuses.

### preferred_days est un JSONB

Tableau de jours : `[0, 2, 4]` (lundi=0, mercredi=2, vendredi=4).

### ON DELETE CASCADE

- `training_plans.goal_id` → ON DELETE SET NULL (le plan peut survivre a la suppression d'un objectif)
- `planned_weeks.plan_id` → ON DELETE CASCADE
- `planned_sessions.plan_id` → ON DELETE CASCADE
- `planned_sessions.completed_session_id` → ON DELETE SET NULL

### References

- [Architecture section 10](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#10)
- [Architecture sections 2.5, 2.6, 5](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md)
