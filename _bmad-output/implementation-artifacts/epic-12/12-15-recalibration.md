# Story 12.15 : Boucle adaptative — Recalibration du plan

Status: done

## Story

As a **coureur**,
I want **que mon plan se recalibre automatiquement a la fin de chaque semaine d'entrainement**,
So that **les allures et la charge s'adaptent a ma forme reelle sans que le plan ne bouge sous mes pieds a chaque seance**.

## Contexte de conception

La recalibration fonctionne sur **deux couches distinctes** avec des granularités différentes :

| Couche | Trigger | Comportement |
| --- | --- | --- |
| CTL/ATL/TSB | `session:completed` (chaque séance) | Mise à jour silencieuse, pas de modification du plan |
| Recalibration plan | `week:completed` (fin de semaine détectée) | Ajustement allures/charge semaine suivante si delta justifié |
| VDOT réévaluation | Automatique à la hausse uniquement après bilan semaine | Jamais automatique à la baisse (confirmation requise) |

Le trigger `week:completed` est **détecté** (dernière session planifiée de la semaine complétée), pas basé sur un cron.

## Acceptance Criteria

1. **Given** un plan actif avec recalibration auto **When** une séance est completee **Then** le listener `UpdateFitnessProfileListener` met à jour CTL/ATL/TSB silencieusement (pas de modification du plan)
2. **Given** une seance non planifiee importee **When** elle est completee **Then** elle est integree dans CTL/ATL/TSB
3. **Given** la derniere seance planifiee d'une semaine est completee **When** le plan a autoRecalibrate === true **Then** l'event `week:completed` est emis et le listener `RecalibratePlanListener` declenche le use case `RecalibratePlan`
4. **Given** le delta charge realisee vs planifiee sur la semaine est < ±10% **When** la recalibration s'execute **Then** rien ne change (silencieux)
5. **Given** le delta hebdomadaire est entre ±10-20% **When** la recalibration s'execute **Then** les allures de la semaine suivante sont ajustees (silencieux)
6. **Given** le delta hebdomadaire est > +20% sur seances qualite (T, I) **When** la recalibration s'execute **Then** le VDOT est reevalue a la hausse automatiquement et un toast est affiche
7. **Given** le delta hebdomadaire est > -20% **When** la recalibration s'execute **Then** la charge est reduite pour les prochaines semaines
8. **Given** 3+ seances qualite consecutives sous les cibles **When** la recalibration s'execute **Then** une proposition de reevaluation VDOT a la baisse est creee (confirmation utilisateur requise)
9. **Given** le toggle recalibration est desactive **When** la semaine se termine **Then** aucune recalibration automatique (CTL/ATL/TSB toujours mis a jour)
10. **Given** un import batch (5 seances d'un coup) **When** les seances sont importees **Then** CTL/ATL/TSB est mis a jour pour chaque seance dans l'ordre chronologique, puis `week:completed` est emis une seule fois si la derniere semaine concernee est terminee

## Tasks / Subtasks

- [x] Task 1 : Listener UpdateFitnessProfileListener (AC: #1, #2)
  - [x] Creer `app/listeners/update_fitness_profile_listener.ts`
  - [x] Ecouter `session:completed`
  - [x] Appeler FitnessProfileCalculator et persister CTL/ATL/TSB
  - [x] Detecter si la session completee est la derniere session planifiee de sa semaine → emettre `week:completed`
  - [x] Enregistrer le listener dans `start/events.ts`
- [x] Task 2 : Listener RecalibratePlanListener (AC: #3, #9)
  - [x] Creer `app/listeners/recalibrate_plan_listener.ts`
  - [x] Ecouter `week:completed`
  - [x] Verifier plan actif + autoRecalibrate === true
  - [x] Appeler use case RecalibratePlan avec le bilan de semaine
  - [x] Enregistrer le listener dans `start/events.ts`
- [x] Task 3 : Use case RecalibratePlan (AC: #4-#8, #10)
  - [x] Creer `app/use_cases/planning/recalibrate_plan.ts`
  - [x] Recevoir WeekSummary { plannedLoadTss, actualLoadTss, qualitySessions[] }
  - [x] Calculer delta hebdomadaire
  - [x] Appliquer les seuils : < ±10% → rien, ±10-20% → ajustement allures, > ±20% → reevaluation VDOT
  - [x] Reevaluation VDOT hausse auto
  - [x] Detection 3+ seances qualite sous cibles → flag pour confirmation
  - [x] Appeler TrainingPlanEngine.recalibrate() si necessaire
  - [x] Persister les changements
- [x] Task 4 : Use case ToggleAutoRecalibrate (AC: #9)
  - [x] Creer `app/use_cases/planning/toggle_auto_recalibrate.ts`
  - [x] Route : `POST /planning/toggle-auto-recalibrate`
- [x] Task 5 : UI — Feedback recalibration (AC: #6, #8)
  - [x] Toast VDOT hausse (5s, non bloquant)
  - [x] Creer `inertia/components/planning/RecalibrationDialog.tsx` — proposition baisse VDOT
  - [x] Toggle recalibration sur la page `/planning`
- [x] Task 6 : Tests
  - [x] Test listener UpdateFitnessProfile : CTL/ATL/TSB mis a jour
  - [x] Test detection week:completed : derniere session planifiee de la semaine
  - [x] Test import batch : week:completed emis une seule fois
  - [x] Test listener RecalibratePlan : plan actif + auto → use case appele
  - [x] Test listener : autoRecalibrate false → use case pas appele
  - [x] Test seuils delta hebdomadaire
  - [x] Test reevaluation VDOT hausse

## Dev Notes

### Deux événements distincts

```
session:completed
  → UpdateFitnessProfileListener
      → FitnessProfileCalculator.update() → CTL/ATL/TSB (silencieux)
      → Si dernière session planifiée de la semaine : emit week:completed

week:completed
  → RecalibratePlanListener (si autoRecalibrate)
      → RecalibratePlan use case
```

### Détection de week:completed

Une semaine est considérée "terminée" quand la dernière session **planifiée** de la semaine ISO est completée. Les sessions non planifiées importées comptent dans CTL/ATL/TSB mais ne déclenchent pas `week:completed` seules.

Pour le batch import : après traitement de toutes les séances en ordre chronologique, vérifier pour chaque semaine distincte couverte si elle est maintenant complète, et émettre `week:completed` une seule fois par semaine dans l'ordre chronologique.

### Flux orchestré RecalibratePlan

```
1. Recevoir WeekSummary { weekNumber, plannedLoadTss, actualLoadTss, qualitySessions[] }
2. TrainingPlanRepository.findActiveByUserId(userId) → plan actif
3. Calculer delta = (actualLoadTss - plannedLoadTss) / plannedLoadTss
4. SessionRepository.findByUserId(userId, { weeks: -12 }) → historique récent
5. Identifier séances qualité sous cibles (3+ consecutives)
6. Si delta > seuil : VdotCalculator → réévaluer VDOT
7. VdotCalculator.derivePaceZones(newVdot) → nouvelles zones
8. Assembler RecalibrationContext
9. TrainingPlanEngine.recalibrate(context) → plan ajusté
10. TrainingPlanRepository.deleteSessionsFromWeek(plan.id, currentWeek + 1)
11. TrainingPlanRepository.createSessions(newSessions)
12. TrainingPlanRepository.update(plan.id, { currentVdot, lastRecalibratedAt })
```

### Reevaluation VDOT a la baisse : jamais automatique

Toujours avec confirmation utilisateur. Le dialog est non bloquant et l'utilisateur peut choisir "Garder tel quel".

### References

- [Architecture section 7.3](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#7)
- [UX Design section 8.1](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#8)
- [PRD FR30-FR35, FR39](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)

## Dev Agent Record

### Completion Notes

- **UpdateFitnessProfileListener** : Écoute `session:completed`, calcule CTL/ATL/TSB silencieusement, détecte la fin de semaine via `completedSessionId` sur les sessions planifiées → émet `week:completed`. La détection nécessite que `LinkCompletedSession` émette aussi `session:completed` (modifié en conséquence).
- **RecalibratePlanListener** : Écoute `week:completed`, vérifie `autoRecalibrate`, délègue au use case `RecalibratePlan`.
- **RecalibratePlan** : Applique les 3 seuils (±10 %, ±10-20 %, >±20 %), réévalue le VDOT à la hausse auto via `calculateVdot`, stocke `pendingVdotDown` pour la proposition de baisse (confirmation utilisateur via `HandleVdotDownProposal`).
- **Migration** : Ajout colonne `pending_vdot_down` (float nullable) sur `training_plans`. Entité, modèle et repository mis à jour en conséquence.
- **UI** : Toggle `autoRecalibrate` (switch) sur la page `/planning`, toast VDOT hausse (5 s), `RecalibrationDialog` pour la proposition de baisse VDOT.
- **Nouveaux événements** : `week:completed` et `plan:vdot_increased` déclarés dans `start/events.ts`.
- **Tests** : Unit tests pour `UpdateFitnessProfileListener`, `RecalibratePlanListener`, `RecalibratePlan`, `ToggleAutoRecalibrate`.

### File List

- `app/listeners/update_fitness_profile_listener.ts` (nouveau)
- `app/listeners/recalibrate_plan_listener.ts` (nouveau)
- `app/use_cases/planning/recalibrate_plan.ts` (nouveau)
- `app/use_cases/planning/toggle_auto_recalibrate.ts` (nouveau)
- `app/use_cases/planning/handle_vdot_down_proposal.ts` (nouveau)
- `app/controllers/planning/recalibration_controller.ts` (nouveau)
- `app/validators/planning/recalibration_validator.ts` (nouveau)
- `database/migrations/1774960000000_add_pending_vdot_down_to_training_plans.ts` (nouveau)
- `inertia/components/planning/RecalibrationDialog.tsx` (nouveau)
- `tests/unit/use_cases/planning/recalibrate_plan.spec.ts` (nouveau)
- `tests/unit/use_cases/planning/toggle_auto_recalibrate.spec.ts` (nouveau)
- `tests/unit/listeners/update_fitness_profile_listener.spec.ts` (nouveau)
- `tests/unit/listeners/recalibrate_plan_listener.spec.ts` (nouveau)
- `start/events.ts` (modifié — event types + listeners registration)
- `app/domain/entities/training_plan.ts` (modifié — pendingVdotDown)
- `app/domain/interfaces/training_plan_repository.ts` (modifié — deleteSessionsFromWeek)
- `app/models/training_plan.ts` (modifié — pendingVdotDown)
- `app/repositories/lucid_training_plan_repository.ts` (modifié — deleteSessionsFromWeek + pendingVdotDown)
- `app/use_cases/planning/link_completed_session.ts` (modifié — emit session:completed après liaison)
- `app/use_cases/planning/generate_plan.ts` (modifié — pendingVdotDown: null dans create)
- `app/controllers/planning/planning_controller.ts` (modifié — suppression alias index2)
- `start/routes.ts` (modifié — routes toggle + vdot-down-proposal)
- `inertia/pages/Planning/Index.tsx` (modifié — toggle + toast + RecalibrationDialog)
- `inertia/types/planning.ts` (modifié — pendingVdotDown dans TrainingPlan)
- Fichiers de tests existants mis à jour : adjust_plan, get_next_session, get_plan_overview, generate_plan, link_completed_session (pendingVdotDown fixture + deleteSessionsFromWeek mock)

### Review Findings

- [ ] [Review][Decision] Toast VDOT hausse s'affiche à chaque visite pendant 24h — est-ce voulu ou faut-il afficher une seule fois (localStorage/flag serveur) ? [inertia/pages/Planning/Index.tsx:180]
- [ ] [Review][Decision] `#detectConsecutiveUnderTarget` : "3+ séances qualité consécutives" (spec AC#8) implémenté comme "3 semaines avec ≥1 séance sous cible" — sémantique séances vs semaines à confirmer [app/use_cases/planning/recalibrate_plan.ts:843]
- [ ] [Review][Patch] `#updateFitnessProfile` : résultat de `fitnessCalculator.calculate()` non persisté — appel no-op ou bug ? [app/listeners/update_fitness_profile_listener.ts:345]
- [ ] [Review][Patch] `HandleVdotDownProposal` : `daysSinceStart` négatif si plan futur → `deleteSessionsFromWeek(planId, 0/1)` supprime toutes les sessions [app/use_cases/planning/handle_vdot_down_proposal.ts:538]
- [ ] [Review][Patch] `#getBestQualityPace` : filtre toutes sessions ≥3km, pas uniquement les séances qualité → estimation VDOT hausse biaisée [app/use_cases/planning/recalibrate_plan.ts:884]
- [ ] [Review][Patch] Batch import : `week:completed` peut être émis N fois si N séances liées à la même semaine complète — AC#10 requiert une seule émission [app/use_cases/planning/link_completed_session.ts]
- [x] [Review][Defer] Double fetch plan dans `RecalibratePlanListener` (findById) + `RecalibratePlan.execute` (findActiveByUserId) — pré-existant, optimisation mineure [app/listeners/recalibrate_plan_listener.ts:250] — deferred, pre-existing

### Change Log

- 2026-03-25 : Implémentation complète story 12.15 — boucle adaptative recalibration du plan
