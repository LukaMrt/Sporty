# Architecture technique — Module Planning V1

**Auteur :** Luka
**Date :** 2026-03-22
**Input :** PRD Planning Module V1, recherche scientifique, recherche domaine

---

## 1. Principes directeurs

### 1.1 Abstraction complète du moteur de planification

Toutes les intentions métier (générer un plan, recalibrer, créer un plan de maintien, de transition) passent par un **port abstrait unique** : `TrainingPlanEngine`. L'implémentation Daniels est la première — d'autres méthodologies (80/20, Lydiard, norvégien) pourront être ajoutées sans modifier le code appelant.

Ce pattern est identique à celui des connecteurs (`Connector` → `StravaConnector`).

### 1.2 Clean Architecture respectée

Le module planning s'insère dans l'architecture en couches existante :

```
Controller → Use Case → Domain ← Repository (abstract class)
     ↓                              ↑
  Validator                  Implémentation (Lucid / Service)
```

Aucune exception : le domaine n'importe rien, les use cases n'importent que le domaine, les controllers passent par les use cases.

### 1.3 Calculs purs dans le domaine

Le VDOT, les allures dérivées et les formules de régression sont des **fonctions pures** — elles vivent dans `app/domain/services/` (zéro dépendance externe, zéro I/O).

### 1.4 Charge normalisée

La charge de sortie du `TrainingLoadCalculator` est **toujours normalisée en TSS-like** (100 = 1h au seuil), quelle que soit la méthode utilisée (TRIMPexp → hrTSS, rTSS, ou RPE pondéré). Le `FitnessProfileCalculator` reçoit des valeurs comparables.

---

## 2. Ports (domain/interfaces)

### 2.1 Vue d'ensemble

```
app/domain/interfaces/
├── training_plan_engine.ts         # Port central — le "planificateur"
├── training_load_calculator.ts     # Calcul de charge (cascade TRIMPexp → rTSS → RPE)
├── fitness_profile_calculator.ts   # Calcul CTL/ATL/TSB/ACWR à la demande
├── training_plan_repository.ts     # Persistance des plans et séances planifiées
└── training_goal_repository.ts     # Persistance des objectifs
```

### 2.2 `TrainingPlanEngine` — le port central

```typescript
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlanRequest } from '#domain/value_objects/plan_request'
import type { RecalibrationContext } from '#domain/value_objects/recalibration_context'
import type { MaintenancePlanRequest } from '#domain/value_objects/maintenance_plan_request'
import type { TransitionPlanRequest } from '#domain/value_objects/transition_plan_request'

export abstract class TrainingPlanEngine {
  abstract readonly methodology: TrainingMethodology

  abstract generatePlan(request: PlanRequest): Promise<TrainingPlan>
  abstract recalibrate(context: RecalibrationContext): Promise<TrainingPlan>
  abstract generateMaintenancePlan(request: MaintenancePlanRequest): Promise<TrainingPlan>
  abstract generateTransitionPlan(request: TransitionPlanRequest): Promise<TrainingPlan>
}
```

**Contrat :** le port reçoit un DTO complet (profil, VDOT, zones, contraintes) et retourne un plan structuré. Il n'accède jamais à la BDD ni à des services externes — c'est le use case qui orchestre la récupération des données.

### 2.3 `TrainingLoadCalculator`

```typescript
import type { TrainingLoad } from '#domain/value_objects/training_load'
import type { SessionLoadInput } from '#domain/value_objects/session_load_input'

export abstract class TrainingLoadCalculator {
  /**
   * Calcule la charge normalisée (TSS-like) d'une séance.
   * La méthode de calcul est choisie automatiquement selon les données disponibles :
   *   1. Streams FC → TRIMPexp → hrTSS
   *   2. Allure + VDOT → rTSS
   *   3. Sinon → Session RPE pondéré
   */
  abstract calculate(input: SessionLoadInput): TrainingLoad
}
```

### 2.4 `FitnessProfileCalculator`

```typescript
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { TrainingLoad } from '#domain/value_objects/training_load'

export abstract class FitnessProfileCalculator {
  /**
   * Calcule CTL, ATL, TSB et ACWR à la demande depuis un historique de charge.
   * Recalculé intégralement à chaque appel (pas de cache).
   * Les charges doivent être triées par date croissante.
   */
  abstract calculate(loadHistory: { date: string; load: TrainingLoad }[]): FitnessProfile
}
```

### 2.5 `TrainingPlanRepository`

```typescript
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedSession } from '#domain/entities/planned_session'

export abstract class TrainingPlanRepository {
  abstract create(plan: Omit<TrainingPlan, 'id' | 'createdAt'>): Promise<TrainingPlan>
  abstract findActiveByUserId(userId: number): Promise<TrainingPlan | null>
  abstract findById(planId: number): Promise<TrainingPlan | null>
  abstract findByUserId(userId: number): Promise<TrainingPlan[]>
  abstract update(planId: number, data: Partial<TrainingPlan>): Promise<TrainingPlan>

  abstract createSessions(sessions: Omit<PlannedSession, 'id'>[]): Promise<PlannedSession[]>
  abstract findSessionsByPlanId(planId: number): Promise<PlannedSession[]>
  abstract findSessionsByWeek(planId: number, weekNumber: number): Promise<PlannedSession[]>
  abstract updateSession(sessionId: number, data: Partial<PlannedSession>): Promise<PlannedSession>
  abstract deleteSessionsFromWeek(planId: number, fromWeek: number): Promise<void>
}
```

### 2.6 `TrainingGoalRepository`

```typescript
import type { TrainingGoal } from '#domain/entities/training_goal'

export abstract class TrainingGoalRepository {
  abstract create(goal: Omit<TrainingGoal, 'id' | 'createdAt'>): Promise<TrainingGoal>
  abstract findActiveByUserId(userId: number): Promise<TrainingGoal | null>
  abstract findByUserId(userId: number): Promise<TrainingGoal[]>
  abstract update(goalId: number, data: Partial<TrainingGoal>): Promise<TrainingGoal>
}
```

---

## 3. Types partagés (domain/value_objects/planning_types.ts)

Tous les types énumérés du module planning sont centralisés dans un seul fichier pour éviter la dispersion :

```typescript
// app/domain/value_objects/planning_types.ts

// --- Méthodologie de planification ---
export type TrainingMethodology = 'daniels'
// Extensible : 'polarized_80_20' | 'lydiard' | 'norwegian' ...

// --- Profil athlète ---
export type BiologicalSex = 'male' | 'female'

// --- Questionnaire VDOT ---
export type RunningFrequency = 'low' | 'medium' | 'high'          // 0-1 / 2-3 / 4+ par semaine
export type RunningExperience = 'novice' | 'intermediate' | 'experienced'  // < 3m / 3-12m / > 1an
export type TypicalDistance = 'short' | 'medium' | 'long'          // < 5km / 5-10km / > 10km

// --- Plan ---
export type PlanType = 'preparation' | 'transition' | 'maintenance'
export type PlanStatus = 'draft' | 'active' | 'completed' | 'abandoned'
export type GoalStatus = 'active' | 'completed' | 'abandoned'
export type TrainingState = 'idle' | 'preparation' | 'transition' | 'maintenance'

// --- Séances ---
export type SessionType = 'easy' | 'long_run' | 'tempo' | 'interval' | 'repetition' | 'rest' | 'race'
export type IntensityZone = 'E' | 'M' | 'T' | 'I' | 'R'
export type PlannedSessionStatus = 'pending' | 'completed' | 'skipped'
export type IntervalBlockType = 'warmup' | 'work' | 'recovery' | 'cooldown'

// --- Charge ---
export type LoadMethod = 'trimp_exp' | 'rtss' | 'rpe'
```

---

## 4. Services domaine purs (domain/services)

### 4.1 `VdotCalculator`

Fonctions pures — pas un port, pas d'abstraction nécessaire.

```typescript
// app/domain/services/vdot_calculator.ts

import type { PaceZones } from '#domain/value_objects/pace_zones'
import type { RunningFrequency, RunningExperience, TypicalDistance } from '#domain/value_objects/planning_types'
import type { KmSplit } from '#domain/value_objects/run_metrics'

/**
 * Calcule le VDOT (pseudo-VO₂max) depuis une performance.
 * Formules de Daniels & Gilbert (1979) — domaine public.
 */
export function calculateVdot(distanceMeters: number, durationMinutes: number): number

/**
 * Dérive les 5 zones d'allure Daniels depuis un VDOT.
 * Résout l'Équation 1 en inverse pour chaque % de VDOT cible.
 */
export function derivePaceZones(vdot: number): PaceZones

/**
 * Estime le VDOT depuis une VMA (km/h).
 * VMA ≈ vitesse à 100% VO₂max → conversion directe.
 */
export function vdotFromVma(vmaKmh: number): number

/**
 * Estime un VDOT conservateur depuis le questionnaire débutant.
 * Mapping : fréquence × ancienneté × distance → VDOT plancher.
 */
export function vdotFromQuestionnaire(
  frequency: RunningFrequency,
  experience: RunningExperience,
  typicalDistance: TypicalDistance
): number

/**
 * Estime le VDOT depuis un historique de séances (90e percentile).
 * Filtre : running uniquement, distance ≥ 3km, allure régulière, 6 dernières semaines.
 */
export function vdotFromHistory(
  sessions: { distanceKm: number; durationMinutes: number; splits?: KmSplit[] }[]
): number | null
```

### 4.2 Fonctions existantes réutilisables

Le fichier `app/domain/services/heart_rate_zone_service.ts` contient déjà :
- `calculateZones()` — répartition temporelle en 5 zones depuis une courbe FC
- `calculateDrift()` — drift cardiaque
- `calculateTrimp()` — TRIMP simplifié (Lucia) — **non réutilisable** pour le planning, le `TrainingLoadCalculator` calcule le TRIMPexp

---

## 5. Entités domaine (domain/entities)

### 5.1 `TrainingGoal`

```typescript
// app/domain/entities/training_goal.ts

import type { GoalStatus } from '#domain/value_objects/planning_types'

export interface TrainingGoal {
  id: number
  userId: number
  targetDistanceKm: number          // ex: 10, 21.1, 42.195
  targetTimeMinutes: number | null  // ex: 50 pour 50min (optionnel)
  eventDate: string | null          // date de la course (optionnel)
  status: GoalStatus
  createdAt: string
}
```

### 5.2 `TrainingPlan`

```typescript
// app/domain/entities/training_plan.ts

import type { TrainingMethodology, PlanType, PlanStatus } from '#domain/value_objects/planning_types'

export interface TrainingPlan {
  id: number
  userId: number
  goalId: number | null             // null pour maintien/transition sans objectif
  methodology: TrainingMethodology
  planType: PlanType
  status: PlanStatus
  autoRecalibrate: boolean
  vdotAtCreation: number            // snapshot du VDOT au moment de la création
  currentVdot: number               // VDOT courant (peut évoluer via recalibration)
  sessionsPerWeek: number
  preferredDays: number[]           // 0-6 (lundi=0)
  startDate: string
  endDate: string
  createdAt: string
  lastRecalibratedAt: string | null
}
```

### 5.3 `PlannedWeek`

```typescript
// app/domain/entities/planned_week.ts

export interface PlannedWeek {
  id: number
  planId: number
  weekNumber: number                // 1-indexed
  phaseName: string                 // Libre — chaque méthodologie définit ses propres phases
                                    // Ex Daniels : 'FI', 'EQ', 'TQ', 'FQ'
  phaseLabel: string                // Label humain pour l'UI — ex: "Fondation", "Qualité finale"
  isRecoveryWeek: boolean           // semaine allégée (-20 à -30%)
  targetVolumeMinutes: number       // volume cible de la semaine
}
```

`PlannedWeek` est stocké en BDD comme entité distincte. Les phases sont un `string` libre, pas un enum domaine — chaque implémentation du `TrainingPlanEngine` définit ses propres valeurs. Les constantes Daniels (`'FI' | 'EQ' | 'TQ' | 'FQ'`) vivent dans `DanielsPlanEngine`, pas dans le domaine.

### 5.4 `PlannedSession`

```typescript
// app/domain/entities/planned_session.ts

import type {
  SessionType,
  IntensityZone,
  PlannedSessionStatus,
  IntervalBlockType,
} from '#domain/value_objects/planning_types'

export interface PlannedSession {
  id: number
  planId: number
  weekNumber: number
  dayOfWeek: number                 // 0-6 (lundi=0)
  sessionType: SessionType
  description: string               // Détail complet lisible
  targetDurationMinutes: number     // Durée totale (incluant échauffement/retour)
  targetDistanceKm: number | null
  targetPacePerKm: string | null    // Allure cible principale (min:sec/km)
  intensityZone: IntensityZone      // Zone dominante
  intervals: IntervalBlock[] | null // Détail des intervalles si applicable
  targetLoadTss: number | null      // Charge planifiée (TSS-like)
  completedSessionId: number | null // Lien vers la séance réalisée
  status: PlannedSessionStatus
}

export interface IntervalBlock {
  type: IntervalBlockType
  durationMinutes: number | null
  distanceMeters: number | null
  targetPacePerKm: string | null
  intensityZone: IntensityZone
  repetitions: number | null        // null pour warmup/cooldown
}
```

---

## 6. Value Objects (domain/value_objects)

### 6.1 `FitnessProfile`

```typescript
// app/domain/value_objects/fitness_profile.ts

export interface FitnessProfile {
  chronicTrainingLoad: number       // CTL — forme acquise (fitness), EMA τ=42j
  acuteTrainingLoad: number         // ATL — fatigue récente, EMA τ=7j
  trainingStressBalance: number     // TSB = CTL - ATL — fraîcheur / état de forme
  acuteChronicWorkloadRatio: number // ACWR = ATL / CTL — risque blessure (seuil 1.3)
  calculatedAt: string
}
```

### 6.2 `PaceZones`

```typescript
// app/domain/value_objects/pace_zones.ts

export interface PaceZoneRange {
  minPacePerKm: string              // ex: "5:30"
  maxPacePerKm: string              // ex: "6:10"
  speedKmh: { min: number; max: number }
}

export interface PaceZones {
  easy: PaceZoneRange
  marathon: PaceZoneRange
  threshold: PaceZoneRange
  interval: PaceZoneRange
  repetition: PaceZoneRange
}
```

### 6.3 `TrainingLoad`

```typescript
// app/domain/value_objects/training_load.ts

import type { LoadMethod } from '#domain/value_objects/planning_types'

export interface TrainingLoad {
  value: number                     // Toujours normalisé en TSS-like (100 = 1h seuil)
  method: LoadMethod                // Méthode utilisée (pour debug/affichage)
}
```

### 6.4 `SessionLoadInput`

```typescript
// app/domain/value_objects/session_load_input.ts

import type { DataPoint, KmSplit } from '#domain/value_objects/run_metrics'
import type { BiologicalSex } from '#domain/value_objects/planning_types'

export interface SessionLoadInput {
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  perceivedEffort: number | null    // RPE 0-10

  // Profil athlète
  vdot: number | null
  maxHeartRate: number | null
  restingHeartRate: number | null
  sex: BiologicalSex | null         // Pour coefficient k du TRIMPexp

  // Données enrichies (optionnelles)
  heartRateCurve: DataPoint[] | null
  splits: KmSplit[] | null
}
```

### 6.5 DTOs d'entrée du moteur

```typescript
// app/domain/value_objects/plan_request.ts

import type { PaceZones } from '#domain/value_objects/pace_zones'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'

export interface PlanRequest {
  userId: number
  goalId: number
  targetDistanceKm: number
  targetTimeMinutes: number | null  // ex: 50 pour 50min
  eventDate: string | null
  vdot: number
  paceZones: PaceZones
  fitnessProfile: FitnessProfile | null  // null si pas d'historique
  sessionsPerWeek: number
  preferredDays: number[]           // 0-6
  planDurationWeeks: number
}
```

```typescript
// app/domain/value_objects/recalibration_context.ts

import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { TrainingLoad } from '#domain/value_objects/training_load'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { PaceZones } from '#domain/value_objects/pace_zones'

export interface RecalibrationContext {
  plan: TrainingPlan
  remainingSessions: PlannedSession[]
  completedSession: {
    plannedSessionId: number | null   // null si séance non planifiée
    actualLoad: TrainingLoad
    actualPacePerKm: string | null
    actualDurationMinutes: number
    actualDistanceKm: number | null
  }
  currentVdot: number
  updatedPaceZones: PaceZones
  fitnessProfile: FitnessProfile
}
```

```typescript
// app/domain/value_objects/maintenance_plan_request.ts

import type { PaceZones } from '#domain/value_objects/pace_zones'

export interface MaintenancePlanRequest {
  userId: number
  vdot: number
  paceZones: PaceZones
  sessionsPerWeek: number
  preferredDays: number[]
}
```

```typescript
// app/domain/value_objects/transition_plan_request.ts

import type { PaceZones } from '#domain/value_objects/pace_zones'

export interface TransitionPlanRequest {
  userId: number
  vdot: number
  paceZones: PaceZones
  raceDistanceKm: number            // Pour déterminer la durée de transition
}
```

---

## 7. Use Cases (app/use_cases/planning/)

### 7.1 Liste des use cases

| Use Case                  | Responsabilité                                  |
| ------------------------- | ----------------------------------------------- |
| `CreateGoal`              | Créer un objectif de course                     |
| `UpdateGoal`              | Modifier un objectif                            |
| `AbandonGoal`             | Abandonner un objectif (et le plan associé)     |
| `EstimateVdot`            | Estimer le VDOT via les 3 niveaux d'entonnoir   |
| `GeneratePlan`            | Orchestrer la génération d'un plan complet      |
| `AdjustPlan`              | Modifier des séances individuelles              |
| `RecalibratePlan`         | Recalibrer le plan après une séance             |
| `ToggleAutoRecalibrate`   | Activer/désactiver la recalibration auto        |
| `GenerateMaintenancePlan` | Générer un plan de maintien                     |
| `GenerateTransitionPlan`  | Générer un plan de transition                   |
| `AbandonPlan`             | Abandonner le plan actif                        |
| `GetPlanOverview`         | Récupérer le plan actif avec ses séances        |
| `GetWeekDetail`           | Récupérer le détail d'une semaine               |
| `LinkCompletedSession`    | Lier une séance réalisée à une séance planifiée |

### 7.2 Flux orchestré — `GeneratePlan`

```
1. TrainingGoalRepository.findActiveByUserId(userId) → goal
2. TrainingPlanRepository.findActiveByUserId(userId) → vérifier pas de plan actif
3. SessionRepository.findByUserId(userId, { last6Weeks }) → historique
4. TrainingLoadCalculator.calculate(session) → pour chaque séance
5. FitnessProfileCalculator.calculate(loadHistory) → CTL/ATL/TSB
6. VdotCalculator.calculateVdot() ou .vdotFromVma() ou .vdotFromHistory() → VDOT
7. VdotCalculator.derivePaceZones(vdot) → zones d'allure
8. Assembler le PlanRequest
9. TrainingPlanEngine.generatePlan(request) → plan structuré
10. TrainingPlanRepository.create(plan) → persister plan
11. TrainingPlanRepository.createSessions(sessions) → persister séances
12. Mettre à jour userProfile.trainingState → 'preparation'
```

### 7.3 Flux orchestré — `RecalibratePlan`

```
1. TrainingPlanRepository.findActiveByUserId(userId) → plan actif
2. Vérifier plan.autoRecalibrate === true (si déclenché par event)
3. TrainingLoadCalculator.calculate(completedSession) → charge réalisée
4. Comparer avec charge planifiée (plannedSession.targetLoadTss)
5. SessionRepository.findByUserId(userId, { all }) → historique complet
6. FitnessProfileCalculator.calculate(loadHistory) → CTL/ATL/TSB mis à jour
7. Si delta > seuil : VdotCalculator → réévaluer VDOT
8. VdotCalculator.derivePaceZones(newVdot) → nouvelles zones
9. Assembler RecalibrationContext
10. TrainingPlanEngine.recalibrate(context) → plan ajusté
11. TrainingPlanRepository.deleteSessionsFromWeek(plan.id, currentWeek + 1)
12. TrainingPlanRepository.createSessions(newSessions) → remplacer
13. TrainingPlanRepository.update(plan.id, { currentVdot, lastRecalibratedAt })
```

---

## 8. Système d'événements

### 8.1 Event `session:completed`

```typescript
// start/events.ts
import emitter from '@adonisjs/core/services/emitter'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'session:completed': { sessionId: number; userId: number }
  }
}
```

### 8.2 Listener `RecalibratePlanListener`

```typescript
// app/listeners/recalibrate_plan_listener.ts

export default class RecalibratePlanListener {
  async handle({ sessionId, userId }: { sessionId: number; userId: number }) {
    // 1. Vérifier qu'un plan actif existe avec autoRecalibrate: true
    // 2. Appeler le use case RecalibratePlan
  }
}
```

### 8.3 Points d'émission

L'event `session:completed` est émis dans :
- `ImportSessions` use case (après import Strava)
- `CreateSession` use case (après saisie manuelle)
- `SyncConnector` use case (après sync auto)

---

## 9. Implémentations

### 9.1 `DanielsPlanEngine` (app/services/training/)

Implémente `TrainingPlanEngine` avec `methodology = 'daniels'`.

```
app/services/training/
├── daniels_plan_engine.ts           # Implémentation du port
├── banister_fitness_calculator.ts   # FitnessProfileCalculator → CTL/ATL/TSB
└── training_load_calculator_impl.ts # TrainingLoadCalculator → cascade
```

**Responsabilités du `DanielsPlanEngine` :**
- Répartir les semaines en 4 phases (FI/EQ/TQ/FQ) à parts égales
- Placer les 3 séances qualité (Q) par semaine + easy runs + repos
- Appliquer les règles de volume Daniels (long run ≤ 30%, I ≤ 8%, T ≤ 10%, R ≤ 5%)
- Gérer la progression (+10% max/semaine) et les semaines de récup (toutes les 3-4 semaines)
- Intégrer le taper en phase FQ si date d'événement
- Générer les blocs d'intervalles détaillés avec échauffement/retour au calme

### 9.2 `BanisterFitnessCalculator`

Implémente `FitnessProfileCalculator`.

- chronicTrainingLoad(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / 42
- acuteTrainingLoad(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / 7
- trainingStressBalance(t) = CTL(t) - ATL(t)
- acuteChronicWorkloadRatio = ATL / CTL

Recalcule la série complète à chaque appel, en itérant jour par jour.

### 9.3 `TrainingLoadCalculatorImpl`

Implémente `TrainingLoadCalculator`.

**Cascade :**
1. Si `heartRateCurve` + `maxHeartRate` + `restingHeartRate` → TRIMPexp → normaliser en hrTSS
2. Si `splits` ou `distanceKm`/`durationMinutes` + `vdot` → rTSS (IF² × durée)
3. Si `perceivedEffort` → Session RPE × durée / coefficient de normalisation
4. Sinon → `{ value: 0, method: 'rpe' }`

**Normalisation TRIMPexp → hrTSS :**
- Calculer TRIMPexp_1h_LTHR (référence : 1h à la FC de seuil lactique)
- hrTSS = (TRIMPexp_séance / TRIMPexp_1h_LTHR) × 100

### 9.4 Bindings IoC (providers/app_provider.ts)

```typescript
// Ajouts dans register()

this.app.container.bind(TrainingPlanEngine, async () => {
  const { DanielsPlanEngine } = await import('#services/training/daniels_plan_engine')
  return new DanielsPlanEngine()
})

this.app.container.bind(TrainingLoadCalculator, async () => {
  const { TrainingLoadCalculatorImpl } = await import('#services/training/training_load_calculator_impl')
  return new TrainingLoadCalculatorImpl()
})

this.app.container.bind(FitnessProfileCalculator, async () => {
  const { BanisterFitnessCalculator } = await import('#services/training/banister_fitness_calculator')
  return new BanisterFitnessCalculator()
})

this.app.container.bind(TrainingPlanRepository, async () => {
  const { default: LucidTrainingPlanRepository } = await import('#repositories/lucid_training_plan_repository')
  return new LucidTrainingPlanRepository()
})

this.app.container.bind(TrainingGoalRepository, async () => {
  const { default: LucidTrainingGoalRepository } = await import('#repositories/lucid_training_goal_repository')
  return new LucidTrainingGoalRepository()
})
```

---

## 10. Schéma de base de données

### 10.1 Table `training_goals`

```sql
CREATE TABLE training_goals (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_distance_km  DECIMAL(6,3) NOT NULL,
  target_time_minutes  INTEGER,            -- durée cible en minutes, nullable
  event_date      DATE,                   -- nullable
  status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | completed | abandoned
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_goals_user_status ON training_goals(user_id, status);
```

### 10.2 Table `training_plans`

```sql
CREATE TABLE training_plans (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id               INTEGER REFERENCES training_goals(id) ON DELETE SET NULL,
  methodology           VARCHAR(50) NOT NULL,           -- 'daniels'
  plan_type             VARCHAR(20) NOT NULL,           -- preparation | transition | maintenance
  status                VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | active | completed | abandoned
  auto_recalibrate      BOOLEAN NOT NULL DEFAULT TRUE,
  vdot_at_creation      DECIMAL(4,1) NOT NULL,
  current_vdot          DECIMAL(4,1) NOT NULL,
  sessions_per_week     INTEGER NOT NULL,
  preferred_days        JSONB NOT NULL DEFAULT '[]',    -- [0,2,4] (lundi, mercredi, vendredi)
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  last_recalibrated_at  TIMESTAMP,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_plans_user_status ON training_plans(user_id, status);
```

### 10.3 Table `planned_weeks`

```sql
CREATE TABLE planned_weeks (
  id                    SERIAL PRIMARY KEY,
  plan_id               INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  week_number           INTEGER NOT NULL,               -- 1-indexed
  phase_name            VARCHAR(20) NOT NULL,            -- Libre par méthodologie (ex: FI, EQ, TQ, FQ)
  phase_label           VARCHAR(50) NOT NULL,            -- Label humain (ex: "Fondation", "Qualité finale")
  is_recovery_week      BOOLEAN NOT NULL DEFAULT FALSE,
  target_volume_minutes INTEGER NOT NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(plan_id, week_number)
);

CREATE INDEX idx_planned_weeks_plan ON planned_weeks(plan_id);
```

### 10.4 Table `planned_sessions`

```sql
CREATE TABLE planned_sessions (
  id                    SERIAL PRIMARY KEY,
  plan_id               INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  week_number           INTEGER NOT NULL,
  day_of_week           INTEGER NOT NULL,               -- 0-6 (lundi=0)
  session_type          VARCHAR(20) NOT NULL,            -- easy | long_run | tempo | interval | repetition | rest | race
  description           TEXT NOT NULL,
  target_duration_minutes INTEGER NOT NULL,
  target_distance_km    DECIMAL(6,3),
  target_pace_per_km    VARCHAR(10),                    -- "MM:SS"
  intensity_zone        VARCHAR(5) NOT NULL,             -- E | M | T | I | R
  intervals             JSONB,                          -- IntervalBlock[]
  target_load_tss       DECIMAL(6,1),                   -- Charge planifiée (TSS-like)
  completed_session_id  INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | completed | skipped
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_planned_sessions_plan_week ON planned_sessions(plan_id, week_number);
CREATE INDEX idx_planned_sessions_completed ON planned_sessions(completed_session_id);
```

### 10.5 Modification de `user_profiles`

```sql
ALTER TABLE user_profiles ADD COLUMN sex VARCHAR(10);                -- 'male' | 'female', nullable
ALTER TABLE user_profiles ADD COLUMN training_state VARCHAR(20) NOT NULL DEFAULT 'idle';  -- idle | preparation | transition | maintenance
```

---

## 11. Pré-requis : migration du typage `sportMetrics`

### 11.1 Objectif

Remplacer `Record<string, unknown>` par un type union `SportMetrics = RunMetrics | Record<string, unknown>` pour que le `TrainingLoadCalculator` travaille avec des types sûrs.

### 11.2 Changements

**Nouveau fichier :**

```typescript
// app/domain/value_objects/sport_metrics.ts

import type { RunMetrics } from '#domain/value_objects/run_metrics'

export type SportMetrics = RunMetrics | Record<string, unknown>

export function isRunMetrics(metrics: SportMetrics): metrics is RunMetrics {
  return (
    metrics !== null &&
    typeof metrics === 'object' &&
    ('splits' in metrics || 'heartRateCurve' in metrics || 'avgPacePerKm' in metrics)
  )
}
```

**Fichiers à modifier (typage uniquement, zéro changement runtime) :**

| Fichier                                         | Changement                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `domain/entities/training_session.ts`           | `sportMetrics: Record<string, unknown>` → `sportMetrics: SportMetrics` |
| `domain/interfaces/connector.ts`                | `MappedSessionData.sportMetrics` → `SportMetrics`                      |
| `models/session.ts`                             | `sportMetrics: Record<string, unknown>` → `sportMetrics: SportMetrics` |
| `use_cases/sessions/create_session.ts`          | Input + suppression des casts `as DataPoint[]`                         |
| `use_cases/sessions/update_session.ts`          | Idem                                                                   |
| `use_cases/sessions/enrich_session_with_gpx.ts` | Suppression `Record<string, unknown>` intermédiaire                    |
| `controllers/sessions/sessions_controller.ts`   | Suppression `as Record<string, unknown>`                               |
| `connectors/strava/strava_connector.ts`         | Variable `enriched` typée `RunMetrics`                                 |
| `inertia/pages/Sessions/Show.tsx`               | Supprimer `SportMetricsWithCurves` locale, importer `RunMetrics`       |

**Pas de migration BDD** — la colonne `sport_metrics` est un JSONB, le contenu ne change pas.

---

## 12. Routes

```typescript
// Ajouts dans start/routes.ts (groupe auth + onboarding)

const PlanningController = () => import('#controllers/planning/planning_controller')
const GoalsController = () => import('#controllers/planning/goals_controller')
const AthleteProfileController = () => import('#controllers/planning/athlete_profile_controller')

// Objectifs
router.get('/planning/goals/create', [GoalsController, 'create'])
router.post('/planning/goals', [GoalsController, 'store'])
router.put('/planning/goals/:id', [GoalsController, 'update'])
router.post('/planning/goals/:id/abandon', [GoalsController, 'abandon'])

// VDOT & profil athlète
router.get('/planning/athlete', [AthleteProfileController, 'show'])
router.post('/planning/estimate-vdot', [AthleteProfileController, 'estimateVdot'])
router.post('/planning/confirm-vdot', [AthleteProfileController, 'confirmVdot'])

// Plans
router.get('/planning', [PlanningController, 'index'])
router.post('/planning/generate', [PlanningController, 'generate'])
router.get('/planning/week/:weekNumber', [PlanningController, 'weekDetail'])
router.put('/planning/sessions/:id', [PlanningController, 'updateSession'])
router.post('/planning/recalibrate', [PlanningController, 'recalibrate'])
router.post('/planning/toggle-auto-recalibrate', [PlanningController, 'toggleAutoRecalibrate'])
router.post('/planning/abandon', [PlanningController, 'abandon'])

// Post-plan
router.post('/planning/transition', [PlanningController, 'generateTransition'])
router.post('/planning/maintenance', [PlanningController, 'generateMaintenance'])
```

---

## 13. Pages React (inertia/pages/)

```
inertia/pages/Planning/
├── Index.tsx                    # Vue du plan actif (semaines scrollables) ou état vide
├── GoalCreate.tsx               # Formulaire objectif (distance, temps, date)
├── VdotEstimation.tsx           # Entonnoir 3 niveaux + confirmation
├── PlanPreview.tsx              # Aperçu du plan avant validation (paramétrage)
├── WeekDetail.tsx               # Détail d'une semaine
└── AthleteProfile.tsx           # Profil athlète (VDOT, zones, CTL/ATL/TSB)

inertia/components/planning/
├── WeekCard.tsx                 # Résumé d'une semaine dans la vue plan
├── SessionCard.tsx              # Résumé d'une séance planifiée
├── SessionDetail.tsx            # Détail complet d'une séance (intervalles)
├── PhaseIndicator.tsx           # Indicateur visuel de phase (FI/EQ/TQ/FQ)
├── AcwrWarning.tsx              # Bannière warning ACWR > 1.3
├── FitnessChart.tsx             # Graphique CTL/ATL/TSB
├── PaceZonesDisplay.tsx         # Affichage des zones d'allure
├── NextSessionWidget.tsx        # Widget dashboard "prochaine séance"
└── VdotEstimationForm.tsx       # Composant formulaire entonnoir VDOT
```

---

## 14. Intégration dans l'existant — Résumé des fichiers impactés

| Fichier existant                              | Modification                          |
| --------------------------------------------- | ------------------------------------- |
| `providers/app_provider.ts`                   | 5 nouveaux bindings IoC               |
| `start/routes.ts`                             | ~15 nouvelles routes                  |
| `start/events.ts`                             | Déclaration event `session:completed` |
| `app/domain/entities/user_profile.ts`         | Ajout `sex: BiologicalSex \| null`, `trainingState: TrainingState` |
| `app/domain/value_objects/run_metrics.ts`     | Inchangé                              |
| `app/use_cases/sessions/create_session.ts`    | Émettre `session:completed`           |
| `app/use_cases/import/import_sessions.ts`     | Émettre `session:completed`           |
| `app/use_cases/connectors/sync_connector.ts`  | Émettre `session:completed`           |
| `inertia/pages/Dashboard.tsx` (ou équivalent) | Intégrer `NextSessionWidget`          |
| 9 fichiers pour migration sportMetrics        | Voir section 10                       |

---

## 15. Découpage en épiques (ajusté)

### Épique 0 — Pré-requis techniques (Story 0)

- Migration typage `sportMetrics` → `SportMetrics` union type + type guard `isRunMetrics()`
- Ajout champs `sex`, `trainingState` sur `user_profiles`
- Déclaration event `session:completed` + émission dans les use cases existants

### Épique 1 — Profil athlète, VDOT & métriques de charge

- `VdotCalculator` (service domaine pur) : les 4 méthodes d'estimation
- `TrainingLoadCalculator` port + implémentation (cascade TRIMPexp → rTSS → RPE)
- `FitnessProfileCalculator` port + implémentation Banister
- `PaceZones` dérivation depuis VDOT
- Onboarding entonnoir 3 niveaux (UI + use case `EstimateVdot`)
- Page profil athlète (VDOT, zones, CTL/ATL/TSB, ACWR)

### Épique 2 — Objectifs & génération de plan

- CRUD `TrainingGoal` (entité, repository, use cases, controller, UI)
- Port `TrainingPlanEngine` + implémentation `DanielsPlanEngine`
- Use case `GeneratePlan` (orchestration complète)
- Paramétrage (séances/semaine, jours préférés, durée)
- Taper intégré si date d'événement
- Tables `training_plans`, `planned_weeks`, `planned_sessions`
- UI : formulaire objectif → aperçu plan → validation

### Épique 3 — Consultation & ajustement du plan

- Page `/planning` : vue semaine scrollable
- Widget dashboard "prochaine séance"
- Ajustement manuel (déplacer, modifier séances)
- Lien `PlannedSession` ↔ `TrainingSession` (`completedSessionId`)
- Toggle données techniques (phases, VDOT, TSB)
- Warning ACWR (bannière + séance)

### Épique 4 — Boucle adaptative

- Listener `RecalibratePlanListener` sur `session:completed`
- Toggle recalibration auto/manuelle
- Use case `RecalibratePlan` (delta, seuils, réévaluation VDOT)
- Réévaluation VDOT : hausse auto, baisse après 3+ séances + confirmation
- Détection inactivité > 14 jours → proposition reprise
- Séances non planifiées comptent dans la charge

### Épique 5 — Post-plan (transition & maintien)

- Propositions post-plan (UI)
- `GenerateTransitionPlan` (2-4 semaines post-course)
- `GenerateMaintenancePlan` (cycles 4-Week Daniels, boucle)
- Gestion `trainingState` (transitions pilotées par l'utilisateur)
- Détection inactivité > 4 semaines → VDOT réduit, reprise FI

---

## 16. Hors scope V1

- Choix de méthodologie (Daniels imposé — le port est prêt pour d'autres)
- Méthodologies alternatives (80/20, Lydiard, norvégien)
- DFA α1 (nécessite streams RR)
- Fitting individuel des constantes Banister (τ₁, τ₂)
- Multi-sport
- Export du plan (PDF, calendrier)
- Partage social
- Push vers montres connectées
- Cache du `FitnessProfileCalculator`
