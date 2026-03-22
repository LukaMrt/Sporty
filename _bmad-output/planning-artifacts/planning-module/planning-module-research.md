# Module Planning V1 — Document de cadrage complet

> Consolidation de la session Party Mode (22/03/2026), des questions ouvertes tranchées et de la recherche scientifique.
> Ce document sert d'input au PRD.

---

## 1. Vision produit

**Job-to-be-Done** : "Je définis un objectif (ex : courir 10 km en 50 min), je reçois un plan personnalisé que je peux ajuster, et après chaque séance réelle le plan se recalibre automatiquement."

### Flux utilisateur

1. **Goal Setting** — L'utilisateur choisit un objectif (distance libre, temps cible optionnel, date événement optionnelle)
2. **Onboarding niveau** — Estimation du VDOT (historique Strava, perf de référence, VMA ou questionnaire)
3. **Plan Generation** — Le système génère un plan Daniels basé sur le profil athlète
4. **Plan Adjustment** — L'utilisateur peut retoucher : durée du plan, nombre de séances/semaine, jours préférés
5. **Execution & Tracking** — L'utilisateur réalise les séances (import Strava ou saisie manuelle)
6. **Adaptive Recalibration** — Après chaque séance, comparaison prévu vs réalisé → ajustement du reste du plan
7. **Post-plan** — Plan terminé → proposition de maintien, nouveau plan, ou transition (décision utilisateur)

---

## 2. Décisions produit (questions tranchées)

### 2.1 Scope & objectifs

| Décision | Choix |
|----------|-------|
| Distances cibles | **Libres** — X km en Y minutes, les deux personnalisables |
| Temps cible | **Optionnel** |
| Date d'événement | **Optionnelle** — durée par défaut si absente (voir table ci-dessous) |
| Objectif "maintenir sa forme" | **Hors V1** |
| Sport | **Running only** |
| Profils supportés | **Tous** — débutant absolu à avancé |
| Méthodologie | **Daniels imposé** en V1 (port abstrait pour futures méthodos) |

**Durées par défaut (sans date d'événement) :**

| Distance | Débutant | Intermédiaire | Avancé |
|----------|----------|---------------|--------|
| 5K | 8 sem | 8 sem | 8 sem |
| 10K | 12 sem | 8 sem | 8 sem |
| Semi | 16 sem | 12 sem | 10 sem |
| Marathon | 20 sem | 16 sem | 14 sem |

Minimum absolu : **8 semaines** (2 semaines × 4 phases). Un plan de suivi peut descendre à **4 semaines** si le profil fitness est proche de l'objectif.

### 2.2 Onboarding & estimation du niveau

**Cas "utilisateur avec historique Strava" :**
- Minimum **3 séances exploitables** (> 2km, > 15min) dans les **6 dernières semaines**
- Filtrage : running uniquement, distance ≥ 3km, allure régulière (faible écart-type entre splits)
- Pour chaque séance éligible, calcul du VDOT → prise du **90e percentile** (pas le max, évite les outliers GPS)
- **Confirmation utilisateur** : "D'après tes données, ton niveau estimé est X — ça te semble juste ?"

**Cas "nouvel utilisateur sans données" — entonnoir en 3 niveaux :**

1. **"J'ai un temps récent"** — Temps sur distance (sélecteur 5K/10K/semi/marathon + champ temps libre) → VDOT direct
2. **"Je connais ma VMA"** — Conversion directe VMA → VDOT (champ déjà existant dans `UserProfile`)
3. **"Je sais pas"** — Questionnaire simple :
   - Combien de fois tu cours par semaine ? (0-1 / 2-3 / 4+)
   - Depuis combien de temps ? (< 3 mois / 3-12 mois / > 1 an)
   - Tu cours combien de km à peu près ? (< 5km / 5-10km / > 10km)
   - → Mapping sur un VDOT conservateur (sous-estimer plutôt que surestimer)

Pas de test initial (Cooper, etc.) — barrière à l'entrée. Le VDOT initial n'a pas besoin d'être parfait, la boucle adaptative corrige en 2-3 semaines.

**Articulation avec le profil existant :**
- `level` → sert pour le questionnaire fallback et dimensionnement par défaut
- `objective` → remplacé fonctionnellement par `TrainingGoal`
- `vma` → conversion directe en VDOT
- `maxHeartRate` / `restingHeartRate` → inputs directs pour TRIMP. Mise à jour auto de FC max si streams Strava montrent une valeur supérieure (proposer, pas imposer). FC repos = saisie manuelle uniquement.
- **Ajout nécessaire** : champ `sex` (optionnel, fallback homme) pour le coefficient k du TRIMPexp (1.92 homme / 1.67 femme, ~15% d'écart)

### 2.3 Génération de plan

**Paramétrage utilisateur :**
- Nombre de séances/semaine : au choix, avec recommandations affichées
- Jours préférés : pré-sélectionnés par défaut, modifiables
- Durée du plan : pré-remplie selon distance × niveau, modifiable avec warning si trop court
- Mode "tout par défaut" : oui, un clic pour générer

**Structure Daniels :**
- 4 phases : FI (Foundation) → EQ (Early Quality) → TQ (Transition Quality) → FQ (Final Quality / Taper)
- Durée de chaque phase = durée totale ÷ 4
- 3 séances qualité (Q) par semaine + Easy runs + repos
- Taper intégré en V1 si date d'événement (phase FQ = réduction volume, maintien intensité)
- Sans date d'événement : durée par défaut, plan a une date de fin calculée

**Contenu des séances :**
- Détail complet : type + durée totale + allure cible + détail intervalles si applicable
- Ex : "Échauffement 15min E + 6×800m à 4:10/km (récup 400m jog) + retour 10min E — durée totale ~55min"
- E et long run en **durée**, intervalles I et R en **distance** (convention Daniels)
- Échauffement/retour au calme **inclus** dans la durée totale affichée

### 2.4 Consultation & UX

- **Page dédiée** `/planning` pour la vue complète + **widget dashboard** "prochaine séance"
- Vue **par semaine**, scrollable/navigable dans le temps
- Toggle pour afficher les données techniques (phases, VDOT, TSB)
- Allures affichées selon les préférences utilisateur (min/km ou km/h)
- Détails UX (comparaison prévu/réalisé, indicateurs de progression, récap hebdo) : à préciser en phase UX design

### 2.5 Boucle adaptative

**Déclenchement :**
- Toggle sur la page plan : "recalibration auto" (défaut) ou "recalibration manuelle"
- En mode auto : recalibration après **chaque séance** importée (via event system AdonisJS `emitter`)
- Import en batch (5 séances d'un coup) : recalibration unitaire pour chaque séance

**Seuils (appliqués sur la charge TSS) :**

| Delta prévu vs réalisé | Action |
|------------------------|--------|
| < ±10% | Aucune — variation normale |
| ±10% à ±20% | Ajustement mineur des allures cibles semaine suivante |
| > +20% (surperformance) | Réévaluer le VDOT à la hausse, ajuster les allures |
| > -20% (sous-performance) | Réduire la charge des séances suivantes |
| Séance manquée ponctuelle | Reporter ou compenser (max 1 séance qualité décalée) |
| 2+ semaines sans séance | Proposer : "Reprendre avec recalibrage ou nouveau plan ?" |

**Réévaluation du VDOT :**
- À la hausse : automatique si séance qualité (T, I) significativement au-dessus des allures cibles
- À la baisse : **pas automatique** — seulement après 3+ séances consécutives sous les cibles sur des séances qualité. Proposition à l'utilisateur ("tes dernières séances suggèrent un ajustement — accepter ?")

**Séances non planifiées :**
- Comptent dans la charge (CTL/ATL/TSB se calcule sur toutes les séances)
- Pas de lien avec une séance planifiée (pas de `completedSessionId`)
- Déclenchent la recalibration si le delta de charge le justifie

### 2.6 Warning ACWR & prévention blessure

- ACWR = ATL / CTL, seuil fixe à **1.3**
- Affiché **sur la séance concernée** + **en bannière globale**
- **Purement informatif** (pas de blocage)

### 2.7 Post-plan : transition, maintien, reprise

**Modèle d'états de l'athlète :**

```
┌──────────────┐     objectif défini     ┌──────────────────┐
│  MAINTIEN    │ ──────────────────────→ │  PRÉPARATION     │
│  (4-Week)    │                          │  (FI→EQ→TQ→FQ)  │
└──────┬───────┘                          └────────┬─────────┘
       ↑                                           │
       │        ┌──────────────┐                   │ plan terminé
       │        │  TRANSITION  │ ←─────────────────┘
       └────────│  (2-4 sem)   │
    récup finie └──────────────┘
```

**Pas de transitions automatiques — l'app propose, l'utilisateur décide :**
- Plan terminé → "Ton plan est fini. Veux-tu un plan de maintien ou définir un nouvel objectif ?"
- Post-course → "Course terminée ! Veux-tu une phase de transition ?"
- Inactivité > 14 jours → "Tu n'as pas couru depuis 2 semaines. Veux-tu reprendre ou mettre en pause ?"
- Inactivité > 4 semaines → VDOT réduit estimé, reprise par phase FI si nouveau plan

**Plan de maintien (cycles 4-Week Daniels) :**
- 3 semaines de charge + 1 semaine allégée
- 2 séances structurées/semaine + 1 easy run
- Volume réduit à 30-40% du volume pic
- Allures basées sur le VDOT actuel
- Tourne en boucle jusqu'à ce que l'utilisateur définisse un nouvel objectif

**Plan de transition (post-course) :**
- 2-4 semaines selon la distance courue
- Volume réduit de 60-70%, intensité maintenue modérément
- Fréquence réduite (min 2-3×/semaine)

**Un seul plan actif à la fois.** Les anciens plans sont historisés (complétés/abandonnés).

---

## 3. Fondements scientifiques

### 3.1 Méthode retenue : Jack Daniels — VDOT

**Source** : *Daniels' Running Formula* (4th edition, 2022)

Score VDOT calculé via deux équations de régression (Daniels & Gilbert, 1979) :

```
VO₂ = -4.60 + 0.182258 × v + 0.000104 × v²        (v = vitesse en m/min)
%VO₂max = 0.8 + 0.1894393 × e^(-0.012778 × t) + 0.2989558 × e^(-0.1932605 × t)   (t = durée en min)
VDOT = VO₂ / %VO₂max
```

Les formules sont publiées académiquement et dans le **domaine public**. Pas besoin des tables du livre.

**5 zones d'allure dérivées du VDOT :**

| Zone | % VDOT | Usage |
|------|--------|-------|
| E | 59-74% | Endurance fondamentale |
| M | 75-84% | Allure marathon |
| T | 83-88% | Seuil lactique (tempo) |
| I | 95-100% | Intervalles VO₂max |
| R | 105-120% | Répétitions vitesse |

**4 phases de Daniels :**

| Phase | Nom | Focus | Séances qualité | Durée type |
|-------|-----|-------|-----------------|------------|
| FI | Foundation & Injury Prevention | Base aérobie | E, strides | ¼ du plan |
| EQ | Early Quality | Introduction vitesse | R + T occasionnel | ¼ du plan |
| TQ | Transition Quality | Phase la plus dure | I + T | ¼ du plan |
| FQ | Final Quality | Affûtage, spécifique | T + M, réduction volume | ¼ du plan |

**Règles de volume :**
- Long run : max 25-30% du volume hebdomadaire
- Intervalles I : max 8% du volume hebdo (ou 10km)
- Seuil T : max 10% du volume hebdo (ou 60min continu)
- Répétitions R : max 5% du volume hebdo
- Augmentation hebdo : max +10%
- Semaine de récupération : toutes les 3-4 semaines, réduire de 20-30%

### 3.2 Modèle de charge : Fitness-Fatigue (Banister)

**Source** : Banister et al. (1975)

```
CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / 42
ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / 7
TSB(t) = CTL(t) - ATL(t)
```

Constantes τ₁=42, τ₂=7 : **valeurs standard** en V1. Fitting individuel hors scope V1.

**Interprétation du TSB :**

| TSB | État | Action |
|-----|------|--------|
| > +25 | Très frais, désentraîné | Augmenter la charge |
| +10 à +25 | Frais, prêt à performer | Fenêtre de course |
| -10 à +10 | Zone neutre | Entraînement normal |
| -10 à -30 | Fatigue modérée | Charge productive |
| < -30 | Surentraînement possible | Réduire la charge |

### 3.3 Métriques de charge par séance

**TRIMPexp de Banister (1991)** — le standard pour le module planning :

```
TRIMPexp = Σ (Δt × HRr × 0.64 × e^(k × HRr))
```
- HRr = (FC_exercice - FC_repos) / (FC_max - FC_repos)
- k = 1.92 (homme) / 1.67 (femme)

**⚠️ Le TRIMP existant dans Sporty** (`sportMetrics.trimp`) est un TRIMP simplifié par zones (Lucia's TRIMP), **trop grossier** pour le modèle Fitness-Fatigue. Le TRIMPexp sera calculé séparément par le `TrainingLoadCalculator`.

**Cascade selon les données disponibles :**
1. Si streams FC → TRIMPexp / hrTSS (le plus précis)
2. Si allure + VDOT → rTSS (IF² × durée)
3. Sinon → Session RPE (perceivedEffort × durée)

### 3.4 ACWR — Prévention blessure

```
ACWR = ATL / CTL
```

| ACWR | Zone | Risque |
|------|------|--------|
| < 0.80 | Sous-entraînement | Moyen |
| 0.80-1.30 | **Zone optimale** | Faible |
| 1.30-1.50 | Danger | Élevé |
| > 1.50 | Zone rouge | Très élevé |

### 3.5 Taper (Mujika & Padilla, 2003)

- Volume : réduire de **40-60%** (progressif non-linéaire)
- Intensité : **maintenir**
- Fréquence : réduire de max 20%
- Durée : 10-14 jours (5K-10K), 14-21 jours (semi/marathon)
- Gain attendu : ~3% de performance

### 3.6 Désentraînement et maintien

- **Perte VO₂max** : -7% après 2-4 semaines, -14 à -18% après 8 semaines (meta-analyse PMC 2022)
- **Dose minimale de maintien** : 30-40% du volume pic, fréquence réduite max 30%, intensité maintenue → maintient les acquis pendant 8-15 semaines (Hickson, 1985)

---

## 4. Architecture technique

### 4.1 Principe directeur : abstraction complète

Même pattern que les connecteurs (`Connector` → `StravaConnector`). Le `TrainingPlanEngine` est un port abstrait — il reçoit un DTO complet et génère un plan. Le use case orchestre la récupération des données.

### 4.2 Ports (domain/interfaces)

```
app/domain/interfaces/
├── training_plan_engine.ts      # Port principal — le "planificateur"
├── training_load_calculator.ts  # Calcul de charge (TRIMPexp, rTSS, RPE)
├── fitness_profile_calculator.ts # Calcul CTL/ATL/TSB
├── training_plan_repository.ts  # Persistance des plans
└── training_goal_repository.ts  # Persistance des objectifs
```

#### `TrainingPlanEngine` — Le port central

```typescript
export abstract class TrainingPlanEngine {
  abstract readonly methodology: string
  abstract generatePlan(request: PlanRequest): Promise<TrainingPlan>
  abstract recalibrate(context: RecalibrationContext): Promise<TrainingPlan>
  abstract generateMaintenancePlan(request: MaintenancePlanRequest): Promise<TrainingPlan>
  abstract generateTransitionPlan(request: TransitionPlanRequest): Promise<TrainingPlan>
}
```

Le use case orchestre tout avant d'appeler le moteur :

```
GeneratePlan use case:
  1. SessionRepository → récupérer l'historique
  2. FitnessProfileCalculator → calculer CTL/ATL/TSB
  3. VdotCalculator → calculer VDOT + pace zones
  4. Assembler le DTO d'entrée
  5. TrainingPlanEngine.generatePlan(dto)
  6. TrainingPlanRepository → persister
```

### 4.3 Entités domain

#### `TrainingGoal`

```typescript
export interface TrainingGoal {
  id: number
  userId: number
  targetDistanceKm: number        // ex: 10
  targetTime?: string             // ex: "00:50:00" (optionnel)
  eventDate?: string              // date de la course (optionnel)
  status: GoalStatus              // 'active' | 'completed' | 'abandoned'
  createdAt: string
}
```

#### `TrainingPlan`

```typescript
export interface TrainingPlan {
  id: number
  userId: number
  goalId: number | null           // null pour les plans de maintien
  methodology: string
  planType: PlanType              // 'preparation' | 'transition' | 'maintenance'
  status: PlanStatus              // 'draft' | 'active' | 'completed' | 'abandoned'
  autoRecalibrate: boolean        // toggle recalibration auto
  weeks: PlannedWeek[]
  startDate: string
  endDate: string
  createdAt: string
  lastRecalibratedAt?: string
}

export type PlanType = 'preparation' | 'transition' | 'maintenance'
```

#### `PlannedSession`

```typescript
export interface PlannedSession {
  id: number
  planId: number
  weekNumber: number
  dayOfWeek: number               // 0-6
  sessionType: SessionType
  description: string             // Détail complet avec échauffement/retour au calme
  targetDurationMinutes: number   // Durée totale (incluant échauff/retour)
  targetDistanceKm?: number
  targetPacePerKm?: string
  targetHeartRateZone?: number
  intensityZone: IntensityZone
  intervals?: IntervalBlock[]     // Détail des intervalles si applicable
  completedSessionId?: number
  status: PlannedSessionStatus
}

export interface IntervalBlock {
  type: 'warmup' | 'work' | 'recovery' | 'cooldown'
  durationMinutes?: number
  distanceMeters?: number
  targetPacePerKm?: string
  intensityZone: IntensityZone
  repetitions?: number
}
```

### 4.4 Value Objects

```typescript
// FitnessProfile — calculé à la demande, pas stocké
export interface FitnessProfile {
  ctl: number
  atl: number
  tsb: number
  acwr: number                    // ATL / CTL
  vdot: number
  calculatedAt: string
}

// PaceZones — dérivées du VDOT
export interface PaceZones {
  easy: { min: string; max: string }
  marathon: { min: string; max: string }
  threshold: { min: string; max: string }
  interval: { min: string; max: string }
  repetition: { min: string; max: string }
}
```

### 4.5 Event System (AdonisJS Emitter)

```typescript
// Émis par le use case d'import/création de séance
emitter.emit('session:completed', { sessionId, userId })

// Listener planning
emitter.on('session:completed', [RecalibratePlanListener])
```

Le listener vérifie s'il existe un plan actif avec `autoRecalibrate: true` avant de recalibrer.

### 4.6 Champ `trainingState` sur le profil

```typescript
export type TrainingState = 'idle' | 'preparation' | 'transition' | 'maintenance'
```

Ajouté à `UserProfile`. Pas de transitions automatiques — l'app propose, l'utilisateur décide via les actions UI.

### 4.7 Intégration dans l'architecture existante

| Élément | Emplacement | Rôle |
|---------|-------------|------|
| Ports abstraits | `app/domain/interfaces/` | Contrats du module planning |
| Entités & VOs | `app/domain/entities/` + `value_objects/` | Modèle métier pur |
| Use cases | `app/use_cases/planning/` | `CreateGoal`, `GeneratePlan`, `AdjustPlan`, `RecalibratePlan`, `GenerateMaintenancePlan`, `GenerateTransitionPlan` |
| Implémentations | `app/services/training/` | `DanielsPlanEngine`, `BanisterFitnessCalculator`, `TrimpLoadCalculator` |
| Repositories | `app/repositories/` | `LucidTrainingPlanRepository`, `LucidTrainingGoalRepository` |
| Binding IoC | `providers/app_provider.ts` | `TrainingPlanEngine → DanielsPlanEngine` |
| Controllers | `app/controllers/planning/` | Thin controllers |
| Pages | `inertia/pages/Planning/` | UI du module |
| Events | `start/events.ts` | `session:completed → RecalibratePlanListener` |

---

## 5. Données existantes exploitables

| Donnée | Source | Champ | Utilité planning |
|--------|--------|-------|------------------|
| FC moyenne | Strava / saisie | `avgHeartRate` | Calcul TRIMP |
| FC min/max | Streams Strava | `sportMetrics.minHeartRate/maxHeartRate` | Zones FC, TRIMP précis |
| Allure par km | GPX / Streams | `sportMetrics.splits[]` | Calcul rTSS, estimation VDOT |
| Courbe FC | Streams | `sportMetrics.heartRateCurve` | TRIMPexp précis, cardiac drift |
| TRIMP simplifié | Déjà calculé | `sportMetrics.trimp` | **Non réutilisable** pour le planning (Lucia's TRIMP ≠ Banister TRIMPexp) |
| Zones FC | Déjà calculé | `sportMetrics.hrZones` | Distribution polarisée |
| Cardiac drift | Déjà calculé | `sportMetrics.cardiacDrift` | Indicateur de fatigue aérobie |
| Effort perçu | Saisie | `perceivedEffort` | Session RPE (fallback) |
| VMA | Profil | `userProfile.vma` | Conversion directe → VDOT |
| FC max / repos | Profil | `userProfile.maxHeartRate/restingHeartRate` | Zones FC, TRIMP |
| Niveau | Profil | `userProfile.level` | Dimensionnement par défaut du plan |

---

## 6. Découpage en épiques

### Épique 1 — Profil athlète, VDOT & métriques de charge

- Calcul VDOT (formules Daniels-Gilbert) depuis historique / perf / VMA / questionnaire
- TRIMPexp (Banister) + cascade rTSS / RPE
- FitnessProfile calculé à la demande (CTL/ATL/TSB/ACWR)
- Dérivation PaceZones depuis VDOT
- Ajout champ `sex` au profil (optionnel, fallback homme)
- Ajout champ `trainingState` au profil
- UI : page profil athlète avec VDOT, zones, état de forme
- Onboarding : entonnoir 3 niveaux pour estimation du niveau

### Épique 2 — Objectifs & génération de plan

- CRUD `TrainingGoal` (distance libre + temps optionnel + date optionnelle)
- Port `TrainingPlanEngine` + implémentation `DanielsPlanEngine`
- Génération plan multi-semaines : 4 phases, séances détaillées avec intervalles
- Paramétrage : séances/semaine, jours préférés, durée (avec warnings)
- Taper intégré si date d'événement
- Persistance des séances planifiées en BDD
- UI : formulaire objectif → aperçu plan → validation

### Épique 3 — Consultation & ajustement du plan

- Page `/planning` : vue semaine scrollable
- Widget dashboard "prochaine séance"
- Ajustement manuel : déplacer, modifier des séances individuelles
- Lien PlannedSession ↔ TrainingSession (séance réalisée)
- Toggle données techniques (phases, VDOT, TSB)
- Warning ACWR (bannière + séance)

### Épique 4 — Boucle adaptative

- Event system : `session:completed` → `RecalibratePlanListener`
- Toggle recalibration auto/manuelle sur le plan
- Calcul delta prévu vs réalisé (sur la charge TSS)
- Réévaluation VDOT (hausse auto, baisse après 3+ séances + confirmation utilisateur)
- Recalibration des semaines restantes
- Détection inactivité > 14 jours → proposition de reprise
- Détection plan "cassé" (2+ semaines sans séance) → proposition nouveau plan

### Épique 5 — Post-plan (transition & maintien)

- Plan terminé → proposition (maintien / nouvel objectif / transition)
- Génération plan de transition (2-4 semaines post-course)
- Génération plan de maintien (cycles 4-Week Daniels, boucle)
- Gestion du `trainingState` (idle → preparation → transition → maintenance)
- Toutes les transitions pilotées par l'utilisateur (pas automatiques)

### Hors V1

- [x] Choix de méthodologie (Daniels imposé)
- [x] Méthodologies alternatives (80/20, Lydiard, norvégien)
- [x] DFA α1 (nécessite streams RR non disponibles)
- [x] Fitting individuel des constantes Banister
- [x] Multi-sport
- [x] Export du plan (PDF, calendrier)
- [x] Partage social du plan
- [x] Intégration montre connectée

---

## 7. Références bibliographiques

1. Banister, E.W. et al. (1975). *A systems model of training for athletic performance.* Australian Journal of Sports Medicine, 7, 57-61.
2. Banister, E.W. (1991). *Modeling elite athletic performance.* In: Physiological Testing of Elite Athletes, Human Kinetics.
3. Bosquet, L. et al. (2007). *Effects of tapering on performance: a meta-analysis.* Medicine & Science in Sports & Exercise, 39(8), 1358-1365.
4. Daniels, J. & Gilbert, J. (1979). *Oxygen Power: Performance Tables for Distance Runners.*
5. Daniels, J. (2022). *Daniels' Running Formula.* 4th edition, Human Kinetics.
6. Foster, C. et al. (2001). *A new approach to monitoring exercise training.* Journal of Strength and Conditioning Research, 15(1), 109-115.
7. Fitzgerald, M. (2014). *80/20 Running.* Penguin Books.
8. Hickson, R.C. et al. (1985). *Reduced training intensities and loss of aerobic power, endurance, and cardiac growth.* Journal of Applied Physiology.
9. Lydiard, A. (2011). *Running to the Top.* Meyer & Meyer Sport.
10. Mujika, I. & Padilla, S. (2003). *Scientific bases for precompetition tapering strategies.* Medicine & Science in Sports & Exercise, 35(7), 1182-1187.
11. Peng et al. (2023). *Bayesian inference of the Banister impulse-response model.* SportRxiv preprint.
12. Pfitzinger, P. & Douglas, S. (2019). *Advanced Marathoning.* 3rd edition, Human Kinetics.
13. Seiler, S. (2010). *What is best practice for training intensity and duration distribution?* IJSPP, 5(3), 276-291.
14. Nature Scientific Reports (2025). *ML-based personalized training models for optimizing marathon performance.*
15. PMC (2022). *Detraining meta-analysis VO2max.*
16. PMC (2025). *ACWR for predicting sports injury risk: systematic review and meta-analysis.*

Pour les formules détaillées, algorithmes et sources web : voir `research/domain-training-planning-science-research-2026-03-22.md`.
