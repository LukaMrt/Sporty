# Story 12.15 : Boucle adaptative — Recalibration du plan

Status: pending

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

- [ ] Task 1 : Listener UpdateFitnessProfileListener (AC: #1, #2)
  - [ ] Creer `app/listeners/update_fitness_profile_listener.ts`
  - [ ] Ecouter `session:completed`
  - [ ] Appeler FitnessProfileCalculator et persister CTL/ATL/TSB
  - [ ] Detecter si la session completee est la derniere session planifiee de sa semaine → emettre `week:completed`
  - [ ] Enregistrer le listener dans `start/events.ts`
- [ ] Task 2 : Listener RecalibratePlanListener (AC: #3, #9)
  - [ ] Creer `app/listeners/recalibrate_plan_listener.ts`
  - [ ] Ecouter `week:completed`
  - [ ] Verifier plan actif + autoRecalibrate === true
  - [ ] Appeler use case RecalibratePlan avec le bilan de semaine
  - [ ] Enregistrer le listener dans `start/events.ts`
- [ ] Task 3 : Use case RecalibratePlan (AC: #4-#8, #10)
  - [ ] Creer `app/use_cases/planning/recalibrate_plan.ts`
  - [ ] Recevoir WeekSummary { plannedLoadTss, actualLoadTss, qualitySessions[] }
  - [ ] Calculer delta hebdomadaire
  - [ ] Appliquer les seuils : < ±10% → rien, ±10-20% → ajustement allures, > ±20% → reevaluation VDOT
  - [ ] Reevaluation VDOT hausse auto
  - [ ] Detection 3+ seances qualite sous cibles → flag pour confirmation
  - [ ] Appeler TrainingPlanEngine.recalibrate() si necessaire
  - [ ] Persister les changements
- [ ] Task 4 : Use case ToggleAutoRecalibrate (AC: #9)
  - [ ] Creer `app/use_cases/planning/toggle_auto_recalibrate.ts`
  - [ ] Route : `POST /planning/toggle-auto-recalibrate`
- [ ] Task 5 : UI — Feedback recalibration (AC: #6, #8)
  - [ ] Toast VDOT hausse (5s, non bloquant)
  - [ ] Creer `inertia/components/planning/RecalibrationDialog.tsx` — proposition baisse VDOT
  - [ ] Toggle recalibration sur la page `/planning`
- [ ] Task 6 : Tests
  - [ ] Test listener UpdateFitnessProfile : CTL/ATL/TSB mis a jour
  - [ ] Test detection week:completed : derniere session planifiee de la semaine
  - [ ] Test import batch : week:completed emis une seule fois
  - [ ] Test listener RecalibratePlan : plan actif + auto → use case appele
  - [ ] Test listener : autoRecalibrate false → use case pas appele
  - [ ] Test seuils delta hebdomadaire
  - [ ] Test reevaluation VDOT hausse

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
