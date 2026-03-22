---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: [planning-module-research.md, planning-v1-open-questions.md, research/domain-training-planning-science-research-2026-03-22.md]
workflowType: 'prd'
classification:
  projectType: web_app
  domain: fitness-training
  complexity: high
  projectContext: brownfield
---

# Product Requirements Document — Module Planning V1

**Auteur :** Luka
**Date :** 2026-03-22

---

## Résumé exécutif

### Problème

Les coureurs qui veulent progresser n'ont pas d'outil accessible pour obtenir un plan d'entraînement personnalisé, adaptatif et fondé sur la science. Les solutions existantes sont soit trop simplistes (plans PDF statiques), soit réservées aux athlètes élites avec coach, soit des boîtes noires non transparentes.

### Solution

Le Module Planning V1 de Sporty permet à tout coureur — débutant absolu à avancé — de définir un objectif de course (distance libre + temps optionnel + date optionnelle), de recevoir un plan structuré basé sur la méthodologie Daniels (VDOT), et de voir ce plan se recalibrer automatiquement après chaque séance réalisée.

### Différenciateur produit

**La boucle adaptative en temps réel.** Chaque séance importée (Strava ou saisie manuelle) déclenche une comparaison prévu vs réalisé et un ajustement automatique du reste du plan. Le système converge vers le niveau réel du coureur en 2-3 semaines, sans punir les mauvaises séances ni sur-optimiser après une bonne.

### Job-to-be-Done

> "Je définis un objectif (ex : courir 10 km en 50 min), je reçois un plan personnalisé que je peux ajuster, et après chaque séance réelle le plan se recalibre automatiquement."

### Flux utilisateur principal

1. **Goal Setting** — Objectif : distance libre, temps cible optionnel, date événement optionnelle
2. **Onboarding niveau** — Estimation VDOT (historique Strava, perf de référence, VMA ou questionnaire)
3. **Plan Generation** — Plan Daniels basé sur le profil athlète
4. **Plan Adjustment** — Retouches : durée du plan, nombre de séances/semaine, jours préférés
5. **Execution & Tracking** — Réalisation des séances (import Strava ou saisie manuelle)
6. **Adaptive Recalibration** — Comparaison prévu vs réalisé → ajustement du reste du plan
7. **Post-plan** — Proposition : maintien, nouveau plan ou transition

### Contexte technique

Module ajouté à Sporty existant (AdonisJS v6 + Inertia + React + Tailwind v4). Clean Architecture avec ports abstraits — le moteur Daniels est une implémentation interchangeable derrière `TrainingPlanEngine`.

---

## Critères de succès

### Succès utilisateur

| #   | Critère                                       | Mesure                                                                |
| --- | --------------------------------------------- | --------------------------------------------------------------------- |
| SU1 | Création d'un plan en moins de 3 minutes      | Temps moyen du flow objectif → plan généré                            |
| SU2 | Plan perçu comme adapté au niveau réel        | Taux de confirmation VDOT à l'onboarding ≥ 80%                        |
| SU3 | Recalibration réduit l'écart plan ↔ capacités | Delta VDOT estimé vs observé < 5% après 3 semaines                    |
| SU4 | Plan compréhensible sans expertise            | Labels clairs, phases nommées simplement, pas de jargon bloquant      |
| SU5 | Utilisable par un débutant absolu             | Questionnaire fallback (niveau 3) produit un VDOT conservateur viable |

### Succès technique

| #   | Critère                           | Mesure                                                                        |
| --- | --------------------------------- | ----------------------------------------------------------------------------- |
| ST1 | Moteur de plan interchangeable    | Port `TrainingPlanEngine` abstrait, implémentation Daniels injectable via IoC |
| ST2 | Calculs de charge précis          | TRIMPexp validé contre valeurs de référence (erreur < 5%)                     |
| ST3 | Recalibration performante         | < 500ms par recalibration                                                     |
| ST4 | Architecture conforme aux couches | Dependency-cruiser passe sans violations sur le module planning               |

### Succès produit

| #   | Critère                        | Mesure                                                               |
| --- | ------------------------------ | -------------------------------------------------------------------- |
| SP1 | Utilisateurs suivent leur plan | ≥ 60% des séances planifiées réalisées sur 4 semaines                |
| SP2 | Plans terminés                 | ≥ 40% des plans arrivent au statut "completed"                       |
| SP3 | Transition post-plan utilisée  | ≥ 30% créent un plan de maintien ou nouvel objectif après complétion |

---

## Parcours utilisateurs

### Parcours 1 — Marie, coureuse intermédiaire avec historique Strava

**Profil :** Court 3×/semaine depuis 2 ans, Strava connecté, vise un semi en 1h50.

1. Marie accède à la page Planning et clique "Définir un objectif"
2. Elle entre : 21.1 km, temps cible 1h50, date de course le 15 juin
3. Le système analyse ses 3+ séances Strava éligibles (> 3km, allure régulière, 6 dernières semaines) → VDOT estimé à 42 (90e percentile)
4. Confirmation : "D'après tes données, ton niveau estimé correspond à un VDOT de 42 — ça te semble juste ?"
5. Marie confirme → plan de 12 semaines généré (4 phases × 3 semaines)
6. Elle ajuste les jours préférés (mardi, jeudi, dimanche) et valide
7. Vue semaine : première semaine FI avec easy runs + strides
8. Détail d'une séance qualité : "Échauffement 15min E + 6×800m à 4:10/km (récup 400m jog) + retour 10min E — durée totale ~55min"
9. Après chaque import Strava, recalibration silencieuse
10. Semaine 5 : allures tempo 8% plus rapides que prévu → VDOT réévalué à 43, allures ajustées
11. Semaines 11-12 : taper automatique (volume -50%, intensité maintenue)
12. Post-course → "Veux-tu une phase de transition ?" → 3 semaines de récup
13. Transition finie → "Plan de maintien ou nouvel objectif ?"

### Parcours 2 — Julien, débutant total sans données

**Profil :** N'a jamais couru, pas de Strava, veut "arriver à courir 5 km".

1. Julien crée son objectif : 5 km, pas de temps cible, pas de date
2. Pas d'historique → entonnoir d'estimation :
   - "J'ai un temps récent" → Non
   - "Je connais ma VMA" → Non
   - Questionnaire : "0-1 fois/semaine", "< 3 mois", "< 5km" → VDOT conservateur de 25
3. Plan de 8 semaines par défaut (débutant + 5K)
4. Séances courtes en phase FI (20-30 min, allures E très basses)
5. Saisie manuelle → charge calculée via Session RPE (effort perçu × durée)
6. Après 3 semaines, efforts perçus montrent une progression → allures ajustées
7. Plan terminé → "Tu peux courir 5 km ! Nouvel objectif ou maintien ?"

### Parcours 3 — Sophie, coureuse avancée avec FC et streams

**Profil :** Court 5×/semaine, capteur FC, vise un marathon en 3h20.

1. Objectif : 42.195 km, 3h20, date dans 16 semaines
2. Streams FC → TRIMPexp précis, VDOT estimé à 48 (confirmé)
3. Plan 16 semaines avec taper intégré
4. Toggle "données techniques" activé : phases FI/EQ/TQ/FQ, TSB affiché
5. Warning ACWR > 1.3 sur une séance intense après repos → ajustement
6. Recalibration auto continue
7. Semaine 14 : taper progressif non-linéaire
8. Post-marathon : transition 4 semaines, puis maintien cycles 4-Week

---

## Exigences domaine

### Fondements scientifiques

Le module repose sur des méthodologies publiées et validées académiquement. Toutes les formules utilisées sont dans le domaine public.

| Composant           | Méthodologie                                       | Source                                   |
| ------------------- | -------------------------------------------------- | ---------------------------------------- |
| Planification       | Jack Daniels — VDOT, 4 phases, 5 zones d'allure    | Daniels & Gilbert (1979), Daniels (2022) |
| Modèle de charge    | Fitness-Fatigue de Banister — CTL/ATL/TSB          | Banister et al. (1975)                   |
| Métrique de charge  | TRIMPexp (cascade : TRIMPexp → rTSS → Session RPE) | Banister (1991), Foster (2001)           |
| Prévention blessure | ACWR — seuil fixe 1.3                              | Méta-analyses PMC (2025)                 |
| Taper               | Réduction progressive non-linéaire                 | Mujika & Padilla (2003)                  |
| Désentraînement     | Dose minimale de maintien                          | Hickson (1985)                           |

### Formules clés

**VDOT (Daniels-Gilbert, 1979) :**

```
VO₂ = -4.60 + 0.182258 × v + 0.000104 × v²        (v = vitesse en m/min)
%VO₂max = 0.8 + 0.1894393 × e^(-0.012778 × t) + 0.2989558 × e^(-0.1932605 × t)   (t = durée en min)
VDOT = VO₂ / %VO₂max
```

**5 zones d'allure :**

| Zone | % VDOT   | Usage                  |
| ---- | -------- | ---------------------- |
| E    | 59-74%   | Endurance fondamentale |
| M    | 75-84%   | Allure marathon        |
| T    | 83-88%   | Seuil lactique (tempo) |
| I    | 95-100%  | Intervalles VO₂max     |
| R    | 105-120% | Répétitions vitesse    |

**TRIMPexp (Banister, 1991) :**

```
TRIMPexp = Σ (Δt × HRr × 0.64 × e^(k × HRr))
HRr = (FC_exercice - FC_repos) / (FC_max - FC_repos)
k = 1.92 (homme) / 1.67 (femme)
```

**Modèle Fitness-Fatigue :**

```
CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / 42
ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / 7
TSB(t) = CTL(t) - ATL(t)
ACWR = ATL / CTL
```

**Cascade de charge selon données disponibles :**

1. Streams FC → TRIMPexp / hrTSS (le plus précis)
2. Allure + VDOT → rTSS (IF² × durée)
3. Sinon → Session RPE (perceivedEffort × durée)

### Contraintes domaine

- Le TRIMP existant (`sportMetrics.trimp`) est un Lucia's TRIMP par zones, **incompatible** avec Banister → TRIMPexp calculé séparément
- Le coefficient k du TRIMPexp dépend du sexe (~15% d'écart) → ajout champ `sex` au profil (optionnel, fallback homme)
- Réévaluation VDOT à la baisse : **pas automatique** — seulement après 3+ séances qualité consécutives sous les cibles, avec confirmation utilisateur
- Les formules de régression Daniels-Gilbert sont publiées académiquement et libres d'utilisation ; les tables pré-calculées du livre sont sous copyright (non utilisées)
- Constantes Banister τ₁=42, τ₂=7 : valeurs standard en V1, fitting individuel hors scope V1

### 4 phases de Daniels

| Phase | Nom                            | Focus                | Séances qualité         | Durée     |
| ----- | ------------------------------ | -------------------- | ----------------------- | --------- |
| FI    | Foundation & Injury Prevention | Base aérobie         | E, strides              | ¼ du plan |
| EQ    | Early Quality                  | Introduction vitesse | R + T occasionnel       | ¼ du plan |
| TQ    | Transition Quality             | Phase la plus dure   | I + T                   | ¼ du plan |
| FQ    | Final Quality                  | Affûtage, spécifique | T + M, réduction volume | ¼ du plan |

### Règles de volume Daniels

- Long run : max 25-30% du volume hebdomadaire
- Intervalles I : max 8% du volume hebdo (ou 10km)
- Seuil T : max 10% du volume hebdo (ou 60min continu)
- Répétitions R : max 5% du volume hebdo
- Augmentation hebdo : max +10%
- Semaine de récupération : toutes les 3-4 semaines, réduction 20-30%

### Taper (Mujika & Padilla, 2003)

- Volume : réduire de 40-60% (progressif non-linéaire)
- Intensité : maintenir
- Fréquence : réduire de max 20%
- Durée : 10-14 jours (5K-10K), 14-21 jours (semi/marathon)

### Désentraînement et maintien

- Dose minimale de maintien : 30-40% du volume pic, fréquence réduite max 30%, intensité maintenue → maintient les acquis 8-15 semaines (Hickson, 1985)
- Perte VO₂max : ~7% après 2-4 semaines, ~15% après 8 semaines

---

## Cadrage du périmètre

### MVP (V1) — Inclus

| Capacité           | Détail                                                          |
| ------------------ | --------------------------------------------------------------- |
| Objectifs running  | Distance libre + temps optionnel + date optionnelle             |
| Méthodologie       | Daniels imposé (port abstrait pour futures méthodos)            |
| Onboarding VDOT    | 3 niveaux : temps récent, VMA, questionnaire                    |
| Profils            | Débutant absolu à avancé                                        |
| Génération de plan | 4 phases (FI/EQ/TQ/FQ), séances détaillées avec intervalles     |
| Paramétrage        | Séances/semaine, jours préférés, durée du plan                  |
| Taper              | Intégré si date d'événement                                     |
| Consultation       | Page `/planning` + widget dashboard "prochaine séance"          |
| Boucle adaptative  | Recalibration auto après chaque séance (toggle auto/manuel)     |
| Warning ACWR       | Informatif, seuil 1.3, séance + bannière                        |
| Post-plan          | Transition, maintien cycles 4-Week, proposition nouvel objectif |
| Ajustement         | Déplacer/modifier des séances individuelles                     |
| Profil athlète     | Page dédiée : VDOT, zones, état de forme                        |

### Durées de plan par défaut (sans date d'événement)

| Distance | Débutant | Intermédiaire | Avancé |
| -------- | -------- | ------------- | ------ |
| 5K       | 8 sem    | 8 sem         | 8 sem  |
| 10K      | 12 sem   | 8 sem         | 8 sem  |
| Semi     | 16 sem   | 12 sem        | 10 sem |
| Marathon | 20 sem   | 16 sem        | 14 sem |

Minimum absolu : **8 semaines** (2 semaines × 4 phases).

### Hors V1

- Choix de méthodologie (Daniels imposé)
- Méthodologies alternatives (80/20, Lydiard, norvégien)
- DFA α1 (nécessite streams RR non disponibles)
- Fitting individuel des constantes Banister (nécessite 8-12 semaines)
- Multi-sport
- Export du plan (PDF, calendrier)
- Partage social du plan
- Intégration montre connectée (push vers Garmin/Apple Watch)
- Objectif "maintenir sa forme" sans distance cible

---

## Exigences fonctionnelles

### Profil athlète & estimation du niveau

- **FR1 :** L'utilisateur peut consulter son profil athlète avec VDOT estimé, zones d'allure et état de forme (CTL/ATL/TSB)
- **FR2 :** Le système peut estimer le VDOT depuis l'historique Strava (minimum 3 séances exploitables > 3km, allure régulière, 6 dernières semaines, 90e percentile)
- **FR3 :** L'utilisateur peut saisir un temps récent sur une distance connue (5K/10K/semi/marathon) pour estimer son VDOT
- **FR4 :** L'utilisateur peut utiliser sa VMA existante pour dériver un VDOT
- **FR5 :** L'utilisateur peut répondre à un questionnaire simplifié (fréquence, ancienneté, distance habituelle) pour obtenir un VDOT conservateur
- **FR6 :** L'utilisateur peut confirmer ou ajuster le VDOT estimé par le système
- **FR7 :** Le système peut calculer le TRIMPexp depuis les streams FC, avec cascade : TRIMPexp → rTSS → Session RPE selon les données disponibles
- **FR8 :** Le système peut calculer CTL, ATL, TSB et ACWR à la demande depuis l'historique de charge
- **FR9 :** L'utilisateur peut renseigner son sexe (optionnel, fallback homme) pour affiner le calcul TRIMPexp
- **FR10 :** Le système peut dériver les 5 zones d'allure (E, M, T, I, R) depuis le VDOT

### Objectifs & génération de plan

- **FR11 :** L'utilisateur peut créer un objectif de course avec distance libre, temps cible optionnel et date d'événement optionnelle
- **FR12 :** Le système peut générer un plan d'entraînement multi-semaines structuré en 4 phases (FI/EQ/TQ/FQ)
- **FR13 :** L'utilisateur peut choisir le nombre de séances par semaine (avec recommandations affichées)
- **FR14 :** L'utilisateur peut sélectionner ses jours préférés d'entraînement (pré-remplis par défaut)
- **FR15 :** L'utilisateur peut modifier la durée du plan (avec warning si trop court par rapport au minimum)
- **FR16 :** L'utilisateur peut accepter tous les paramètres par défaut et générer un plan en un clic
- **FR17 :** Le système peut générer des séances détaillées : type + durée totale (incluant échauffement/retour au calme) + allure cible + détail des intervalles (type, distance/durée, allure, récupération, répétitions)
- **FR18 :** Le système peut appliquer les conventions Daniels : E et long run en durée, intervalles I et R en distance
- **FR19 :** Le système peut intégrer un taper dans la phase FQ si une date d'événement est définie (volume -40-60%, intensité maintenue, progressif non-linéaire)
- **FR20 :** Le système peut appliquer les règles de volume Daniels (long run ≤ 30%, I ≤ 8%, T ≤ 10%, R ≤ 5%, progression ≤ +10%/semaine, semaine récup toutes les 3-4 semaines)
- **FR21 :** Un seul plan peut être actif à la fois par utilisateur
- **FR22 :** Les anciens plans sont historisés avec statut completed ou abandoned

### Consultation & ajustement du plan

- **FR23 :** L'utilisateur peut consulter son plan sur une page dédiée `/planning` avec vue par semaine scrollable et navigable dans le temps
- **FR24 :** L'utilisateur peut voir un widget "prochaine séance" sur le dashboard
- **FR25 :** L'utilisateur peut activer/désactiver l'affichage des données techniques (phases, VDOT, TSB)
- **FR26 :** L'utilisateur peut voir les allures selon ses préférences (min/km ou km/h)
- **FR27 :** L'utilisateur peut déplacer ou modifier des séances individuelles dans le plan
- **FR28 :** Le système peut lier une séance planifiée à une séance réalisée (completedSessionId)
- **FR29 :** Le système peut afficher un warning ACWR > 1.3 sur la séance concernée et en bannière globale (purement informatif)

### Boucle adaptative

- **FR30 :** L'utilisateur peut activer/désactiver la recalibration automatique (toggle sur le plan, défaut : auto)
- **FR31 :** Le système peut recalibrer le plan après chaque séance importée via le système d'événements (`session:completed`)
- **FR32 :** En cas d'import batch (5 séances d'un coup), le système recalibre unitairement pour chaque séance
- **FR33 :** Le système peut comparer la charge réalisée vs planifiée et appliquer les seuils : < ±10% → rien, ±10-20% → ajustement mineur allures semaine suivante, > +20% → réévaluer VDOT hausse, > -20% → réduire charge
- **FR34 :** Le système peut réévaluer le VDOT à la hausse automatiquement si surperformance significative sur séances qualité (T, I)
- **FR35 :** Le système peut proposer une réévaluation du VDOT à la baisse après 3+ séances qualité consécutives sous les cibles (avec confirmation utilisateur)
- **FR36 :** Le système peut gérer une séance manquée ponctuelle (reporter ou compenser, max 1 séance qualité décalée)
- **FR37 :** Le système peut détecter une inactivité > 14 jours et proposer : "Reprendre avec recalibrage ou nouveau plan ?"
- **FR38 :** Le système peut détecter une inactivité > 4 semaines et proposer un nouveau plan avec VDOT réduit estimé
- **FR39 :** Les séances non planifiées comptent dans la charge (CTL/ATL/TSB) sans lien avec une séance planifiée, et déclenchent la recalibration si le delta de charge le justifie

### Post-plan : transition & maintien

- **FR40 :** Le système peut proposer des options à la fin d'un plan : maintien, nouvel objectif ou transition
- **FR41 :** Le système peut générer un plan de transition post-course (2-4 semaines selon distance courue, volume réduit 60-70%, fréquence réduite, intensité modérée)
- **FR42 :** Le système peut générer un plan de maintien en cycles 4 semaines Daniels (3 semaines charge + 1 allégée, 2 séances structurées/semaine + 1 easy, volume 30-40% du pic, allures basées sur VDOT actuel)
- **FR43 :** Le plan de maintien tourne en boucle jusqu'à ce que l'utilisateur définisse un nouvel objectif
- **FR44 :** Le système peut gérer le `trainingState` de l'athlète (idle → preparation → transition → maintenance) — toutes les transitions sont proposées par le système et décidées par l'utilisateur
- **FR45 :** Le système peut proposer une phase de transition après une course terminée (pas de transition automatique — "Course terminée ! Veux-tu une phase de transition ?")
- **FR46 :** Le système peut proposer un plan de reprise après inactivité prolongée ("Tu n'as pas couru depuis 2 semaines. Veux-tu reprendre ou mettre en pause ?")

---

## Exigences non fonctionnelles

### Performance

- **NFR1 :** Génération d'un plan complet : < 2 secondes
- **NFR2 :** Recalibration après import : < 500ms
- **NFR3 :** Calcul FitnessProfile (CTL/ATL/TSB) à la demande : < 200ms

### Précision scientifique

- **NFR4 :** Calcul VDOT reproductible par rapport aux tables Daniels (erreur < 1%)
- **NFR5 :** TRIMPexp validé contre valeurs de référence publiées (erreur < 5%)
- **NFR6 :** Allures dérivées (E/M/T/I/R) conformes aux zones Daniels publiées

### Maintenabilité & extensibilité

- **NFR7 :** Architecture conforme aux couches Clean Architecture (vérifiable par dependency-cruiser, zéro violation)
- **NFR8 :** `TrainingPlanEngine` est un port abstrait permettant l'ajout de méthodologies alternatives sans refactor du code appelant
- **NFR9 :** `TrainingLoadCalculator` supporte la cascade TRIMPexp → rTSS → RPE de manière transparente pour le code appelant

### Intégrité des données

- **NFR10 :** Les plans historisés (completed/abandoned) sont immutables
- **NFR11 :** CTL/ATL/TSB est toujours calculé à la demande, jamais stocké, pour garantir la cohérence si des séances sont réimportées ou supprimées

### UX

- **NFR12 :** Les allures sont affichées dans l'unité préférée de l'utilisateur (min/km ou km/h) sans conversion manuelle

---

## Architecture technique (référence)

> Cette section est une référence pour l'architecte. Elle résume les décisions d'architecture validées lors du cadrage.

### Ports (domain/interfaces)

| Port                       | Responsabilité                                                |
| -------------------------- | ------------------------------------------------------------- |
| `TrainingPlanEngine`       | Génération, recalibration, plans de maintien et transition    |
| `TrainingLoadCalculator`   | Calcul de charge (TRIMPexp, rTSS, RPE) — cascade transparente |
| `FitnessProfileCalculator` | Calcul CTL/ATL/TSB/ACWR à la demande                          |
| `TrainingPlanRepository`   | Persistance des plans et séances planifiées                   |
| `TrainingGoalRepository`   | Persistance des objectifs                                     |

### Entités domaine

```typescript
TrainingGoal {
  id, userId, targetDistanceKm, targetTime?, eventDate?,
  status: 'active' | 'completed' | 'abandoned'
}

TrainingPlan {
  id, userId, goalId?, methodology,
  planType: 'preparation' | 'transition' | 'maintenance',
  status: 'draft' | 'active' | 'completed' | 'abandoned',
  autoRecalibrate: boolean,
  weeks: PlannedWeek[], startDate, endDate
}

PlannedSession {
  id, planId, weekNumber, dayOfWeek,
  sessionType, description, targetDurationMinutes,
  targetDistanceKm?, targetPacePerKm?, intensityZone,
  intervals?: IntervalBlock[],
  completedSessionId?, status
}

IntervalBlock {
  type: 'warmup' | 'work' | 'recovery' | 'cooldown',
  durationMinutes?, distanceMeters?,
  targetPacePerKm?, intensityZone, repetitions?
}
```

### Value Objects

```typescript
FitnessProfile { ctl, atl, tsb, acwr, vdot, calculatedAt }  // Calculé à la demande, pas stocké
PaceZones { easy, marathon, threshold, interval, repetition } // Dérivées du VDOT
```

### Orchestration use case GeneratePlan

```
1. SessionRepository → récupérer l'historique
2. FitnessProfileCalculator → calculer CTL/ATL/TSB
3. VdotCalculator → calculer VDOT + pace zones
4. Assembler le DTO d'entrée
5. TrainingPlanEngine.generatePlan(dto)
6. TrainingPlanRepository → persister
```

### Système d'événements

```
session:completed → RecalibratePlanListener
```

Le listener vérifie l'existence d'un plan actif avec `autoRecalibrate: true` avant de déclencher.

### Modèle d'états de l'athlète

```
IDLE → PREPARATION    (objectif défini)
PREPARATION → fin     (plan terminé / course terminée)
fin → TRANSITION      (utilisateur accepte la transition)
TRANSITION → MAINTENANCE  (récupération finie)
MAINTENANCE → PREPARATION (nouvel objectif)
```

Toutes les transitions sont proposées par le système et décidées par l'utilisateur. Pas de transition automatique.

### Champs ajoutés au profil existant

| Champ           | Type           | Défaut                  | Usage                     |
| --------------- | -------------- | ----------------------- | ------------------------- |
| `sex`           | enum optionnel | fallback homme (k=1.92) | Coefficient TRIMPexp      |
| `trainingState` | enum           | 'idle'                  | État courant de l'athlète |

### Intégration dans l'architecture existante

| Élément         | Emplacement                               |
| --------------- | ----------------------------------------- |
| Ports abstraits | `app/domain/interfaces/`                  |
| Entités & VOs   | `app/domain/entities/` + `value_objects/` |
| Use cases       | `app/use_cases/planning/`                 |
| Implémentations | `app/services/training/`                  |
| Repositories    | `app/repositories/`                       |
| Binding IoC     | `providers/app_provider.ts`               |
| Controllers     | `app/controllers/planning/`               |
| Pages           | `inertia/pages/Planning/`                 |
| Events          | `start/events.ts`                         |

---

## Découpage en épiques

### Épique 1 — Profil athlète, VDOT & métriques de charge

**FR :** FR1-FR10

Fondations de calcul : VDOT (formules Daniels-Gilbert), TRIMPexp (Banister), CTL/ATL/TSB, PaceZones. Ajout champs profil (sex, trainingState). Onboarding 3 niveaux. Page profil athlète.

### Épique 2 — Objectifs & génération de plan

**FR :** FR11-FR22

CRUD TrainingGoal. Port `TrainingPlanEngine` + implémentation `DanielsPlanEngine`. Génération plan 4 phases avec séances détaillées et intervalles. Paramétrage (séances/semaine, jours, durée). Taper. Persistance.

### Épique 3 — Consultation & ajustement du plan

**FR :** FR23-FR29

Page `/planning` (vue semaine scrollable). Widget dashboard "prochaine séance". Ajustement manuel (déplacer/modifier séances). Lien PlannedSession ↔ TrainingSession. Toggle données techniques. Warning ACWR.

### Épique 4 — Boucle adaptative

**FR :** FR30-FR39

Event system (`session:completed` → `RecalibratePlanListener`). Toggle recalibration auto/manuelle. Delta prévu vs réalisé (seuils TSS). Réévaluation VDOT (hausse auto, baisse conditionnelle). Détection inactivité. Séances non planifiées.

### Épique 5 — Post-plan (transition & maintien)

**FR :** FR40-FR46

Propositions post-plan. Génération plan de transition (2-4 semaines). Génération plan de maintien (cycles 4-Week Daniels, boucle). Gestion trainingState. Toutes les transitions pilotées par l'utilisateur.

---

## Données existantes exploitables

| Donnée         | Source          | Champ                                       | Utilité planning                   |
| -------------- | --------------- | ------------------------------------------- | ---------------------------------- |
| FC moyenne     | Strava / saisie | `avgHeartRate`                              | Calcul TRIMP                       |
| FC min/max     | Streams Strava  | `sportMetrics.minHeartRate/maxHeartRate`    | Zones FC, TRIMP précis             |
| Allure par km  | GPX / Streams   | `sportMetrics.splits[]`                     | Calcul rTSS, estimation VDOT       |
| Courbe FC      | Streams         | `sportMetrics.heartRateCurve`               | TRIMPexp précis                    |
| Cardiac drift  | Déjà calculé    | `sportMetrics.cardiacDrift`                 | Indicateur fatigue aérobie         |
| Effort perçu   | Saisie          | `perceivedEffort`                           | Session RPE (fallback)             |
| VMA            | Profil          | `userProfile.vma`                           | Conversion directe → VDOT          |
| FC max / repos | Profil          | `userProfile.maxHeartRate/restingHeartRate` | Zones FC, TRIMP                    |
| Niveau         | Profil          | `userProfile.level`                         | Dimensionnement par défaut du plan |

> **Note :** `sportMetrics.trimp` (Lucia's TRIMP) n'est **pas réutilisable** pour le modèle Fitness-Fatigue. Le TRIMPexp sera calculé séparément par `TrainingLoadCalculator`.

---

## Références bibliographiques

1. Banister, E.W. et al. (1975). *A systems model of training for athletic performance.* Aust J Sports Med, 7, 57-61.
2. Banister, E.W. (1991). *Modeling elite athletic performance.* In: Physiological Testing of Elite Athletes, Human Kinetics.
3. Bosquet, L. et al. (2007). *Effects of tapering on performance: a meta-analysis.* Med Sci Sports Exerc, 39(8), 1358-1365.
4. Daniels, J. & Gilbert, J. (1979). *Oxygen Power: Performance Tables for Distance Runners.*
5. Daniels, J. (2022). *Daniels' Running Formula.* 4th edition, Human Kinetics.
6. Foster, C. et al. (2001). *A new approach to monitoring exercise training.* J Strength Cond Res, 15(1), 109-115.
7. Hickson, R.C. et al. (1985). *Reduced training intensities and loss of aerobic power.* J Appl Physiol.
8. Mujika, I. & Padilla, S. (2003). *Scientific bases for precompetition tapering strategies.* Med Sci Sports Exerc, 35(7), 1182-1187.
9. Peng et al. (2023). *Bayesian inference of the Banister impulse-response model.* SportRxiv preprint.
10. Nature Scientific Reports (2025). *ML-based personalized training models for optimizing marathon performance.*
11. PMC (2025). *ACWR for predicting sports injury risk: systematic review and meta-analysis.*
