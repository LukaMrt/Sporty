# Story 12.15 : Boucle adaptative — Recalibration du plan

Status: pending

## Story

As a **coureur**,
I want **que mon plan se recalibre automatiquement apres chaque seance realisee**,
So that **les allures et la charge s'adaptent a ma forme reelle**.

## Acceptance Criteria

1. **Given** un plan actif avec recalibration auto **When** l'event `session:completed` est emis **Then** le listener `RecalibratePlanListener` declenche le use case `RecalibratePlan`
2. **Given** le delta charge realisee vs planifiee est < ±10% **When** la recalibration s'execute **Then** rien ne change (silencieux)
3. **Given** le delta est entre ±10-20% **When** la recalibration s'execute **Then** les allures de la semaine suivante sont ajustees (silencieux)
4. **Given** le delta est > +20% sur seances qualite (T, I) **When** la recalibration s'execute **Then** le VDOT est reevalue a la hausse automatiquement et un toast est affiche
5. **Given** le delta est > -20% **When** la recalibration s'execute **Then** la charge est reduite pour les prochaines semaines
6. **Given** 3+ seances qualite consecutives sous les cibles **When** la recalibration s'execute **Then** une proposition de reevaluation VDOT a la baisse est creee (confirmation utilisateur requise)
7. **Given** le toggle recalibration est desactive **When** une seance est completee **Then** aucune recalibration automatique
8. **Given** un import batch (5 seances d'un coup) **When** la recalibration s'execute **Then** chaque seance est recalibree unitairement dans l'ordre chronologique
9. **Given** une seance non planifiee (pas de lien planned) **When** elle est importee **Then** elle compte dans la charge (CTL/ATL/TSB) et declenche la recalibration si le delta le justifie

## Tasks / Subtasks

- [ ] Task 1 : Listener RecalibratePlanListener (AC: #1, #7)
  - [ ] Creer `app/listeners/recalibrate_plan_listener.ts`
  - [ ] Verifier plan actif + autoRecalibrate === true
  - [ ] Appeler use case RecalibratePlan
  - [ ] Enregistrer le listener dans `start/events.ts`
- [ ] Task 2 : Use case RecalibratePlan (AC: #2-#6, #8, #9)
  - [ ] Creer `app/use_cases/planning/recalibrate_plan.ts`
  - [ ] Calculer charge realisee via TrainingLoadCalculator
  - [ ] Comparer avec charge planifiee (targetLoadTss)
  - [ ] Appliquer les seuils : < ±10% → rien, ±10-20% → ajustement mineur, > ±20% → reevaluation
  - [ ] Reevaluation VDOT hausse auto
  - [ ] Detection 3+ seances qualite sous cibles → flag pour confirmation
  - [ ] Recalculer FitnessProfile
  - [ ] Appeler TrainingPlanEngine.recalibrate() si necessaire
  - [ ] Persister les changements
- [ ] Task 3 : Use case ToggleAutoRecalibrate (AC: #7)
  - [ ] Creer `app/use_cases/planning/toggle_auto_recalibrate.ts`
  - [ ] Route : `POST /planning/toggle-auto-recalibrate`
- [ ] Task 4 : UI — Feedback recalibration (AC: #4, #6)
  - [ ] Toast VDOT hausse (5s, non bloquant)
  - [ ] Creer `inertia/components/planning/RecalibrationDialog.tsx` — proposition baisse VDOT
  - [ ] Toggle recalibration sur la page `/planning`
- [ ] Task 5 : Tests
  - [ ] Test listener : plan actif + auto → use case appele
  - [ ] Test listener : pas de plan → use case pas appele
  - [ ] Test seuils delta
  - [ ] Test reevaluation VDOT hausse
  - [ ] Test batch import → recalibration unitaire

## Dev Notes

### Flux orchestre RecalibratePlan

```
1. TrainingPlanRepository.findActiveByUserId(userId) → plan actif
2. Verifier plan.autoRecalibrate === true (si trigger event)
3. TrainingLoadCalculator.calculate(completedSession) → charge realisee
4. Comparer avec charge planifiee
5. SessionRepository.findByUserId(userId, { all }) → historique
6. FitnessProfileCalculator.calculate(loadHistory) → CTL/ATL/TSB
7. Si delta > seuil : VdotCalculator → reevaluer VDOT
8. VdotCalculator.derivePaceZones(newVdot) → nouvelles zones
9. Assembler RecalibrationContext
10. TrainingPlanEngine.recalibrate(context) → plan ajuste
11. TrainingPlanRepository.deleteSessionsFromWeek(plan.id, currentWeek + 1)
12. TrainingPlanRepository.createSessions(newSessions)
13. TrainingPlanRepository.update(plan.id, { currentVdot, lastRecalibratedAt })
```

### Reevaluation VDOT a la baisse : jamais automatique

Toujours avec confirmation utilisateur. Le dialog est non bloquant et l'utilisateur peut choisir "Garder tel quel".

### References

- [Architecture section 7.3](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#7)
- [UX Design section 8.1](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#8)
- [PRD FR30-FR35, FR39](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
