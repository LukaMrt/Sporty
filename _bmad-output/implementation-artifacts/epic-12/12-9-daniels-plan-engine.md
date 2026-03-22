# Story 12.9 : DanielsPlanEngine — Generation de plan

Status: pending

## Story

As a **dev (Luka)**,
I want **implementer le port TrainingPlanEngine avec la methodologie Daniels (4 phases, regles de volume, intervalles detailles)**,
So that **le systeme genere des plans structures et scientifiquement fondes**.

## Acceptance Criteria

1. **Given** un `PlanRequest` complet **When** `generatePlan()` est appele **Then** un plan est retourne avec des semaines reparties en 4 phases (FI/EQ/TQ/FQ) a parts egales
2. **Given** un plan genere **When** les seances sont examinees **Then** chaque semaine contient le bon nombre de seances avec types varies (easy, long_run, tempo, interval, repetition, rest)
3. **Given** les regles Daniels **When** les volumes sont verifies **Then** long run ≤ 30% du volume hebdo, I ≤ 8%, T ≤ 10%, R ≤ 5%
4. **Given** la progression hebdomadaire **When** le volume augmente **Then** il augmente de max +10% par semaine
5. **Given** les semaines de recuperation **When** elles sont placees **Then** une semaine allegee (-20 a -30%) est inseree toutes les 3-4 semaines
6. **Given** une seance qualite (I, T, R) **When** ses intervalles sont generes **Then** ils incluent echauffement, blocs de travail avec allure/distance/repetitions, recuperation et retour au calme
7. **Given** une date d'evenement **When** le taper est applique **Then** le volume reduit de 40-60% progressivement en phase FQ, l'intensite est maintenue, la frequence reduit de max 20%
8. **Given** un plan de maintenance **When** `generateMaintenancePlan()` est appele **Then** un cycle 4-Week est retourne (3 sem charge + 1 allegee, 30-40% volume pic)
9. **Given** un plan de transition **When** `generateTransitionPlan()` est appele **Then** un plan 2-4 semaines est retourne (volume 60-70%, intensite moderee)
10. **Given** un `RecalibrationContext` **When** `recalibrate()` est appele **Then** les seances restantes sont regenerees avec les nouvelles allures/VDOT

## Tasks / Subtasks

- [ ] Task 1 : Port TrainingPlanEngine (AC: prerequis)
  - [ ] Creer `app/domain/interfaces/training_plan_engine.ts`
  - [ ] Abstract class avec `generatePlan`, `recalibrate`, `generateMaintenancePlan`, `generateTransitionPlan`
- [ ] Task 2 : Value objects d'entree (AC: prerequis)
  - [ ] Creer `app/domain/value_objects/plan_request.ts`
  - [ ] Creer `app/domain/value_objects/recalibration_context.ts`
  - [ ] Creer `app/domain/value_objects/maintenance_plan_request.ts`
  - [ ] Creer `app/domain/value_objects/transition_plan_request.ts`
- [ ] Task 3 : DanielsPlanEngine — generation (AC: #1, #2, #3, #4, #5)
  - [ ] Creer `app/services/training/daniels_plan_engine.ts`
  - [ ] Repartition des semaines en 4 phases
  - [ ] Placement des seances qualite par phase (FI: E+strides, EQ: R+T, TQ: I+T, FQ: T+M)
  - [ ] Regles de volume Daniels
  - [ ] Progression +10%/semaine max
  - [ ] Semaines de recuperation
- [ ] Task 4 : Generation des intervalles (AC: #6)
  - [ ] Templates d'intervalles par type de seance
  - [ ] Echauffement 15min E + blocs travail + retour 10min E
  - [ ] Convention Daniels : E et long run en duree, I et R en distance
- [ ] Task 5 : Taper (AC: #7)
  - [ ] Reduction progressive non-lineaire du volume (40-60%)
  - [ ] Intensite maintenue
  - [ ] Duree taper selon distance (10-14j pour 5K-10K, 14-21j pour semi/marathon)
- [ ] Task 6 : Plans secondaires (AC: #8, #9)
  - [ ] `generateMaintenancePlan()` — cycles 4-Week (30-40% pic, 2 structurees + 1 easy)
  - [ ] `generateTransitionPlan()` — 2-4 semaines post-course (volume reduit, intensite moderee)
- [ ] Task 7 : Recalibration (AC: #10)
  - [ ] `recalibrate()` — regenere les seances restantes avec nouvelles allures
- [ ] Task 8 : Binding IoC
  - [ ] `TrainingPlanEngine` → `DanielsPlanEngine` dans `providers/app_provider.ts`
- [ ] Task 9 : Tests unitaires
  - [ ] Test generation plan : 4 phases presentes
  - [ ] Test regles de volume respectees
  - [ ] Test progression ≤ +10%/semaine
  - [ ] Test semaines de recuperation placees
  - [ ] Test taper applique si date evenement
  - [ ] Test intervalles bien structures
  - [ ] Test maintenance : cycle 4 semaines
  - [ ] Test transition : duree selon distance

## Dev Notes

### Les phases sont des constantes internes au DanielsPlanEngine

```typescript
const DANIELS_PHASES = {
  FI: { name: 'FI', label: 'Fondation' },
  EQ: { name: 'EQ', label: 'Introduction vitesse' },
  TQ: { name: 'TQ', label: 'Phase intensive' },
  FQ: { name: 'FQ', label: 'Affutage' },
}
```

Ces constantes ne sont PAS dans le domaine — elles sont specifiques a l'implementation Daniels.

### Le moteur est une fonction pure

`generatePlan` recoit un DTO complet et retourne un plan structure. Il n'accede jamais a la BDD — c'est le use case qui orchestre.

### Complexite

C'est la story la plus complexe de l'epic. Prevoir un decoupage en sous-PRs si necessaire.

### References

- [Architecture section 9.1](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#9)
- [PRD section 4 phases Daniels, regles de volume, taper](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
- Daniels (2022), Mujika & Padilla (2003)
