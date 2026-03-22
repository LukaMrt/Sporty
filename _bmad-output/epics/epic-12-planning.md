# Epic 12 : Module Planning — Plan d'entrainement adaptatif

L'utilisateur definit un objectif de course (distance, temps cible optionnel, date optionnelle), recoit un plan d'entrainement personnalise base sur la methodologie Daniels (VDOT, 4 phases, 5 zones d'allure), et voit ce plan se recalibrer automatiquement apres chaque seance realisee. Le systeme gere le cycle complet : objectif → generation → execution → recalibration → post-plan (transition, maintien).

**Objectif strategique :** Transformer Sporty d'un outil de suivi passif en un coach actif qui guide la progression du coureur.

**Includes :** Prerequis techniques (migration typage sportMetrics, event system), VdotCalculator, TrainingLoadCalculator, FitnessProfileCalculator, profil athlete, objectifs, generation de plan Daniels, consultation du plan (vue semaine), widget prochaine seance, ajustement manuel, boucle adaptative (recalibration), post-plan (transition, maintien)

**Input documents :**
- PRD : `_bmad-output/planning-artifacts/planning-module/prd-planning-module.md`
- Architecture : `_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md`
- UX Design : `_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md`
- Recherche scientifique : `_bmad-output/planning-artifacts/planning-module/domain-training-planning-science-research-2026-03-22.md`

---

## Decisions d'architecture

- **Methodologie imposee :** Daniels en V1, derriere un port abstrait `TrainingPlanEngine` pour extensibilite future
- **Calculs purs dans le domaine :** VdotCalculator, formules Daniels-Gilbert — zero dependance externe
- **Charge normalisee en TSS-like :** Cascade TRIMPexp → rTSS → Session RPE, sortie toujours comparable
- **CTL/ATL/TSB jamais stockes :** Calcules a la demande pour coherence si seances reimportees/supprimees
- **Phases = string libre :** Chaque implementation du moteur definit ses propres phases — pas d'enum domaine
- **Event-driven recalibration :** `session:completed` → listener → use case RecalibratePlan

---

## Story 12.1 : Prerequis techniques — Migration typage sportMetrics & event system

As a **dev (Luka)**,
I want **migrer le typage sportMetrics vers un type union, ajouter les champs profil, et declarer le systeme d'evenements**,
So that **le module planning dispose des fondations techniques necessaires**.

**FR :** Prerequis (Epic 0 de l'architecture)

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-1-prerequis-techniques.md`

---

## Story 12.2 : VdotCalculator — Service domaine pur

As a **coureur**,
I want **que le systeme calcule mon VDOT depuis differentes sources (performance, VMA, historique Strava, questionnaire)**,
So that **mon niveau est estime avec precision pour generer un plan adapte**.

**FR :** FR2, FR3, FR4, FR5, FR10

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-2-vdot-calculator.md`

---

## Story 12.3 : TrainingLoadCalculator — Calcul de charge normalise

As a **dev (Luka)**,
I want **un calculateur de charge avec cascade TRIMPexp → rTSS → Session RPE**,
So that **chaque seance a une charge comparable quelle que soit la source de donnees**.

**FR :** FR7

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-3-training-load-calculator.md`

---

## Story 12.4 : FitnessProfileCalculator — CTL/ATL/TSB/ACWR

As a **dev (Luka)**,
I want **un calculateur de profil fitness (modele Banister)**,
So that **le systeme connait l'etat de forme du coureur pour generer et recalibrer les plans**.

**FR :** FR1, FR8

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-4-fitness-profile-calculator.md`

---

## Story 12.5 : Profil athlete — Page & estimation VDOT (UI)

As a **coureur**,
I want **consulter mon profil athlete avec VDOT, zones d'allure et etat de forme**,
So that **je comprends mon niveau et les bases de mon plan**.

**FR :** FR1, FR6, FR9, FR10

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-5-profil-athlete.md`

---

## Story 12.6 : Schema BDD planning — Goals, Plans, Weeks, Sessions

As a **dev (Luka)**,
I want **creer les tables training_goals, training_plans, planned_weeks, planned_sessions et les modeles Lucid associes**,
So that **les donnees du module planning sont persistees**.

**FR :** Prerequis pour FR11-FR22

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-6-schema-bdd-planning.md`

---

## Story 12.7 : CRUD Objectifs (TrainingGoal)

As a **coureur**,
I want **creer, modifier et abandonner un objectif de course**,
So that **je peux definir ce vers quoi je veux progresser**.

**FR :** FR11

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-7-crud-objectifs.md`

---

## Story 12.8 : Goal Setting Wizard (UI)

As a **coureur**,
I want **un wizard guide en 5 etapes (objectif → estimation VDOT → confirmation → parametrage → resume)**,
So that **je definis facilement mon objectif et recois un plan en moins de 3 minutes**.

**FR :** FR11, FR13, FR14, FR15, FR16

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-8-goal-setting-wizard.md`

---

## Story 12.9 : DanielsPlanEngine — Generation de plan

As a **dev (Luka)**,
I want **implementer le port TrainingPlanEngine avec la methodologie Daniels (4 phases, regles de volume, intervalles detailles)**,
So that **le systeme genere des plans structures et scientifiquement fondes**.

**FR :** FR12, FR17, FR18, FR19, FR20

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-9-daniels-plan-engine.md`

---

## Story 12.10 : Use case GeneratePlan — Orchestration complete

As a **coureur**,
I want **que le systeme orchestre la generation d'un plan complet depuis mon objectif**,
So that **je recois un plan personnalise base sur mon profil et mes donnees**.

**FR :** FR12, FR21, FR22

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-10-generate-plan.md`

---

## Story 12.11 : Page /planning — Vue semaine du plan actif

As a **coureur**,
I want **consulter mon plan sur une page dediee avec vue par semaine scrollable**,
So that **je sais quoi faire chaque jour et je suis ma progression**.

**FR :** FR23, FR25, FR26

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-11-page-planning.md`

---

## Story 12.12 : Widget dashboard — Prochaine seance

As a **coureur**,
I want **voir ma prochaine seance planifiee sur le dashboard**,
So that **j'ai un rappel immediat sans naviguer vers la page planning**.

**FR :** FR24

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-12-widget-prochaine-seance.md`

---

## Story 12.13 : Ajustement manuel du plan

As a **coureur**,
I want **deplacer ou modifier des seances individuelles dans mon plan**,
So that **je peux adapter le plan a mes contraintes quotidiennes**.

**FR :** FR27, FR28

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-13-ajustement-manuel.md`

---

## Story 12.14 : Warning ACWR & donnees techniques

As a **coureur avance**,
I want **voir un warning quand ma charge est trop elevee (ACWR > 1.3) et pouvoir activer les donnees techniques**,
So that **je peux prevenir les blessures et comprendre les metriques de mon plan**.

**FR :** FR29

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-14-warning-acwr.md`

---

## Story 12.15 : Boucle adaptative — Recalibration du plan

As a **coureur**,
I want **que mon plan se recalibre automatiquement apres chaque seance realisee**,
So that **les allures et la charge s'adaptent a ma forme reelle**.

**FR :** FR30, FR31, FR32, FR33, FR34, FR35, FR39

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-15-recalibration.md`

---

## Story 12.16 : Detection d'inactivite

As a **coureur**,
I want **etre averti si je n'ai pas couru depuis longtemps et recevoir des propositions adaptees**,
So that **je peux reprendre en securite sans me blesser**.

**FR :** FR36, FR37, FR38

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-16-detection-inactivite.md`

---

## Story 12.17 : Post-plan — Transition & maintien

As a **coureur**,
I want **recevoir des propositions a la fin de mon plan (transition, maintien, nouvel objectif)**,
So that **je continue a progresser sans interruption**.

**FR :** FR40, FR41, FR42, FR43, FR44, FR45, FR46

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-17-post-plan.md`

---

## Story 12.18 : Historique des plans

As a **coureur**,
I want **consulter l'historique de mes anciens plans (termines ou abandonnes)**,
So that **je vois ma progression sur le long terme**.

**FR :** FR22

→ Fichier story : `_bmad-output/implementation-artifacts/epic-12/12-18-historique-plans.md`

---

## Ordre de realisation recommande

```
12.1 Prerequis techniques
  ↓
12.2 VdotCalculator ──────┐
12.3 TrainingLoadCalc ─────┤
12.4 FitnessProfileCalc ──┤
  ↓                        ↓
12.5 Profil athlete (UI)  12.6 Schema BDD
  ↓                        ↓
12.7 CRUD Objectifs ──→ 12.8 Goal Setting Wizard
  ↓
12.9 DanielsPlanEngine
  ↓
12.10 GeneratePlan (orchestration)
  ↓
12.11 Page /planning ──→ 12.12 Widget dashboard
  ↓
12.13 Ajustement manuel
12.14 Warning ACWR
  ↓
12.15 Recalibration
12.16 Detection inactivite
  ↓
12.17 Post-plan (transition & maintien)
12.18 Historique des plans
```
