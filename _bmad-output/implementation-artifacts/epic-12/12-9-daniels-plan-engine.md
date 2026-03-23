# Story 12.9 : DanielsPlanEngine — Generation de plan

Status: pending

## Story

As a **dev (Luka)**,
I want **implementer le port TrainingPlanEngine avec la methodologie Daniels (4 phases, regles de volume, intervalles detailles)**,
So that **le systeme genere des plans structures et scientifiquement fondes**.

## Acceptance Criteria

1. **Given** un `PlanRequest` complet **When** `generatePlan()` est appele **Then** un plan est retourne avec des semaines reparties en 4 phases (FI/EQ/TQ/FQ) a parts egales
2. **Given** un plan genere **When** les seances sont examinees **Then** chaque semaine contient le bon nombre de seances avec types varies (easy, long_run, tempo, marathon_pace, interval, repetition, rest) et le mix de seances qualite correspond a la distance cible
3. **Given** les regles Daniels **When** les volumes sont verifies **Then** long run ≤ 30% du volume hebdo, I ≤ 8%, T ≤ 10%, R ≤ 5%
4. **Given** la progression hebdomadaire **When** le volume augmente **Then** il augmente de max +10% par semaine
5. **Given** les semaines de recuperation **When** elles sont placees **Then** une semaine allegee (-20 a -30%) est inseree toutes les 3-4 semaines
6. **Given** une seance qualite (I, T, R, M) **When** ses intervalles sont generes **Then** ils incluent echauffement, blocs de travail avec allure/distance/repetitions, recuperation (avec duree et type : jog ou repos) et retour au calme
7. **Given** une date d'evenement **When** le taper est applique **Then** le volume reduit de 40-60% progressivement en phase FQ, l'intensite est maintenue, la frequence reduit de max 20%
8. **Given** un plan de maintenance **When** `generateMaintenancePlan()` est appele **Then** un cycle 4-Week est retourne (3 sem charge + 1 allegee, 30-40% volume pic)
9. **Given** un plan de transition **When** `generateTransitionPlan()` est appele **Then** un plan 2-4 semaines est retourne (volume 60-70%, intensite moderee)
10. **Given** un `RecalibrationContext` **When** `recalibrate()` est appele **Then** les seances restantes sont regenerees avec les nouvelles allures/VDOT

## Tasks / Subtasks

- [ ] Task 0 : Alignement des enums existantes (prerequis)
  - [ ] Ajouter `Daniels = 'daniels'` a l'enum `TrainingMethodology` dans `planning_types.ts`
  - [ ] Aligner `SessionType` enum : easy, long_run, tempo, marathon_pace, interval, repetition, recovery, race, cross_training, rest
  - [ ] Migrer `planned_session.ts` : remplacer les types litteraux par les enums de `planning_types.ts`
  - [ ] Migrer `planned_week.ts` : idem
  - [ ] Migrer `training_plan.ts` : remplacer types litteraux par enums, renommer `planType` → `level`
  - [ ] Verifier que les models Lucid et migrations sont coherents avec les nouvelles valeurs
- [ ] Task 1 : Port TrainingPlanEngine (AC: prerequis)
  - [ ] Creer `app/domain/interfaces/training_plan_engine.ts`
  - [ ] Abstract class avec `generatePlan`, `recalibrate`, `generateMaintenancePlan`, `generateTransitionPlan`
  - [ ] Types intermediaires `GeneratedPlan`, `GeneratedWeek`, `GeneratedSession` dans le port
- [ ] Task 2 : Value objects d'entree (AC: prerequis)
  - [ ] Creer `app/domain/value_objects/plan_request.ts`
  - [ ] Creer `app/domain/value_objects/recalibration_context.ts`
  - [ ] Creer `app/domain/value_objects/maintenance_plan_request.ts`
  - [ ] Creer `app/domain/value_objects/transition_plan_request.ts`
- [ ] Task 3 : DanielsPlanEngine — generation (AC: #1, #2, #3, #4, #5)
  - [ ] Creer `app/services/training/daniels_plan_engine.ts`
  - [ ] Repartition des semaines en 4 phases
  - [ ] Matrice phase × distance cible → mix de seances qualite (voir Dev Notes)
  - [ ] Placement des seances qualite par phase (FI: E+strides, EQ: R+T, TQ: I+T, FQ: variable selon distance)
  - [ ] Regles de volume Daniels (en minutes)
  - [ ] Progression +10%/semaine max
  - [ ] Semaines de recuperation
- [ ] Task 4 : Generation des intervalles (AC: #6)
  - [ ] Templates d'intervalles hardcodes par type de seance (I, T, R, M)
  - [ ] Echauffement 15min E + blocs travail + retour 10min E
  - [ ] Convention Daniels : E et long run en duree, I et R en distance
  - [ ] Parametres de recuperation par type (voir Dev Notes) : I = jog meme duree, R = repos 2-4× duree, T cruise = 1min repos
  - [ ] Templates de long run variables par phase : E pur (FI/EQ), E + T finish (TQ), E + M portions (FQ marathon)
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
  - [ ] Test intervalles bien structures (dont recuperation type/duree)
  - [ ] Test mix seances qualite par distance cible (5K vs marathon)
  - [ ] Test long run variable par phase (E pur en FI vs E+T en TQ)
  - [ ] Test maintenance : cycle 4 semaines
  - [ ] Test transition : duree selon distance

## Dev Notes

### Decisions techniques (Party Mode 2026-03-23)

#### Enums = source de verite

Tous les types utilisent les enums de `planning_types.ts`. Les types litteraux dans les entites (`planned_session.ts`, `training_plan.ts`) doivent etre migres vers ces enums (Task 0).

**`SessionType` canonique :**

```typescript
export enum SessionType {
  Easy = 'easy',
  LongRun = 'long_run',
  Tempo = 'tempo',
  MarathonPace = 'marathon_pace',
  Interval = 'interval',
  Repetition = 'repetition',
  Recovery = 'recovery',
  Race = 'race',
  CrossTraining = 'cross_training',
  Rest = 'rest',
}
```

**`TrainingMethodology` — ajout Daniels :**

```typescript
export enum TrainingMethodology {
  Polarized = 'polarized',
  Pyramidal = 'pyramidal',
  Threshold = 'threshold',
  Daniels = 'daniels',
}
```

**`TrainingPlan.planType` → `TrainingPlan.level`** : le champ est renomme pour eviter la confusion avec `PlanType` (distance cible).

#### Signatures du port

Le moteur retourne des types intermediaires (`GeneratedPlan`, `GeneratedWeek`, `GeneratedSession`), PAS des entites persistees. Ces types vivent dans le fichier du port. Le use case mappe ensuite vers `PlannedWeek[]` / `PlannedSession[]`.

```typescript
// app/domain/interfaces/training_plan_engine.ts

export interface GeneratedSession {
  dayOfWeek: number
  sessionType: SessionType
  description: string
  targetDurationMinutes: number
  targetDistanceKm: number | null
  targetPacePerKm: string | null
  intensityZone: IntensityZone
  intervals: IntervalBlock[] | null
}

export interface GeneratedWeek {
  weekNumber: number
  phaseName: string       // 'FI' | 'EQ' | 'TQ' | 'FQ'
  phaseLabel: string
  isRecoveryWeek: boolean
  targetVolumeMinutes: number
  sessions: GeneratedSession[]
}

export interface GeneratedPlan {
  weeks: GeneratedWeek[]
  methodology: TrainingMethodology
  totalWeeks: number
}

export abstract class TrainingPlanEngine {
  abstract generatePlan(request: PlanRequest): GeneratedPlan
  abstract recalibrate(context: RecalibrationContext): GeneratedPlan
  abstract generateMaintenancePlan(request: MaintenancePlanRequest): GeneratedPlan
  abstract generateTransitionPlan(request: TransitionPlanRequest): GeneratedPlan
}
```

#### Value objects d'entree

**`PlanRequest` :**

```typescript
export interface PlanRequest {
  targetDistanceKm: number
  targetTimeMinutes: number | null
  eventDate: string | null
  vdot: number
  paceZones: PaceZones
  totalWeeks: number
  sessionsPerWeek: number
  preferredDays: number[]
  startDate: string
  currentWeeklyVolumeMinutes: number
}
```

**`RecalibrationContext` :**

```typescript
export interface RecalibrationContext {
  currentWeekNumber: number
  newVdot: number
  newPaceZones: PaceZones
  remainingWeeks: GeneratedWeek[]
  originalRequest: PlanRequest
}
```

**`MaintenancePlanRequest` :**

```typescript
export interface MaintenancePlanRequest {
  vdot: number
  paceZones: PaceZones
  sessionsPerWeek: number
  preferredDays: number[]
  currentWeeklyVolumeMinutes: number
}
```

**`TransitionPlanRequest` :**

```typescript
export interface TransitionPlanRequest {
  vdot: number
  paceZones: PaceZones
  sessionsPerWeek: number
  preferredDays: number[]
  previousPeakVolumeMinutes: number
  raceDistanceKm: number
}
```

#### Volume et regles Daniels

- Volume pilote en **minutes** (coherent avec `targetVolumeMinutes` et `targetDurationMinutes`)
- Regles de pourcentage (I ≤ 8%, T ≤ 10%, R ≤ 5%, long run ≤ 30%) appliquees en **minutes de travail effectif** (hors echauffement/recuperation)

#### IntervalBlock — definition enrichie

```typescript
export interface IntervalBlock {
  type: 'warmup' | 'work' | 'recovery' | 'cooldown'
  durationMinutes: number | null
  distanceMeters: number | null
  targetPace: string | null
  intensityZone: IntensityZone
  repetitions: number
  recoveryDurationMinutes: number | null
  recoveryType: 'jog' | 'rest' | null
}
```

#### Templates d'intervalles

Templates **hardcodes** dans `DanielsPlanEngine`. Pas de systeme flexible — le moteur choisit un template selon le type de seance et le volume cible. Chaque template contient : echauffement (15min E), blocs de travail, retour au calme (10min E).

#### Parametres d'intervalles Daniels (source scientifique)

| Type | Duree reps | Distances typiques | Recuperation | Volume max |
|------|-----------|-------------------|-------------|-----------|
| I (VO₂max) | 3-5 min | 800m, 1000m, 1200m | Meme duree que travail (jog) | 8% hebdo ou 10km |
| R (vitesse) | < 2 min | 200m, 400m | 2-4× duree travail (repos complet) | 5% hebdo |
| T (seuil) | Continu 20-60min ou cruise 5-15min blocs | — | 1min repos entre blocs cruise | 10% hebdo ou 60min |
| M (marathon) | 10-20min blocs | — | 1-2min jog entre blocs | Plans semi/marathon uniquement |

#### Long run variable par phase

Le `SessionType.LongRun` est un conteneur dont le contenu varie :

- **FI/EQ** : E pur (allure easy sur toute la duree)
- **TQ** : E + portion finale a allure T ("finish fast long run") — seance qualite hybride
- **FQ** : E + portions a allure M (pour semi/marathon), ou reduit pour 5K/10K

Les templates `IntervalBlock[]` du long run encodent cette variation.

#### Matrice qualite par distance cible

Le mix de seances qualite varie selon la distance cible. Matrice interne au `DanielsPlanEngine` :

| Distance | FI | EQ | TQ | FQ |
|----------|----|----|----|----|
| 5K | E + strides | R focus + T | I focus + T | T + R leger + race |
| 10K | E + strides | R + T | I (1000-1600m) + T continus | T + I leger + race |
| Semi | E + strides | R + T | I + T + M intro | T + M + race |
| Marathon | E + strides | R + T + M intro | I + T + M | M dominant + T leger + race |

**Point cle FQ** : C'est une phase de competition. Les courses reelles remplacent certaines seances qualite (Q2 ou Q3). Le plan doit prevoir cette flexibilite — une seance `Race` peut se substituer a une seance qualite programmee.

**M (marathon_pace)** : L'allure M n'est pertinente que pour les plans semi/marathon. Pour 5K-10K, la FQ inclut T + R leger + courses test, sans M.

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

C'est la story la plus complexe de l'epic. Livree en 1 PR avec des commits atomiques :

1. Alignement enums + migration entites
2. Port + VOs
3. DanielsPlanEngine : phases + seances + volume + progression + recup
4. Templates intervalles + taper
5. Plans secondaires (maintenance/transition) + recalibration
6. Binding IoC + tests unitaires

### References

- [Architecture section 9.1](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#9)
- [PRD section 4 phases Daniels, regles de volume, taper](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
- Daniels (2022), Mujika & Padilla (2003), Bosquet et al. (2007)
