---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments: [planning-module-research.md]
workflowType: 'research'
lastStep: 7
research_type: 'domain'
research_topic: 'Fondements scientifiques du module de planification d entraînement'
research_goals: 'Valider et détailler les formules, algorithmes et sources pour implémenter un moteur de planification adaptatif'
user_name: 'Luka'
date: '2026-03-22'
web_research_enabled: true
source_verification: true
---

# Recherche domaine : Fondements scientifiques du module de planification

**Date :** 2026-03-22
**Auteur :** Luka
**Type :** Recherche domaine — Sciences de l'entraînement

---

## 1. Calcul du VDOT — Formules de Daniels & Gilbert

### 1.1 Les deux équations de régression

Les tables VDOT publiées dans *Oxygen Power* (Daniels & Gilbert, 1979) reposent sur **deux équations de régression** combinées :

#### Équation 1 — Coût en oxygène de la course (VO₂ en fonction de la vitesse)

```
VO₂ = -4.60 + 0.182258 × v + 0.000104 × v²
```

Où `v` = vitesse en **mètres par minute**.

#### Équation 2 — Fraction de VO₂max soutenable en fonction du temps

```
%VO₂max = 0.8 + 0.1894393 × e^(-0.012778 × t) + 0.2989558 × e^(-0.1932605 × t)
```

Où `t` = durée de course en **minutes**.

#### Calcul du VDOT

Pour une performance donnée (distance `d` en mètres, temps `t` en minutes) :

1. Calculer la vitesse : `v = d / t`
2. Calculer le VO₂ de course via l'Équation 1
3. Calculer le %VO₂max soutenable via l'Équation 2
4. **VDOT = VO₂ / %VO₂max**

Le VDOT n'est pas un vrai VO₂max — c'est un **pseudo-VO₂max** qui intègre à la fois la capacité aérobie et l'économie de course.

### 1.2 Dérivation des allures d'entraînement

Chaque zone d'entraînement correspond à un **pourcentage du VDOT** :

| Zone | % VDOT   | Usage                  |
| ---- | -------- | ---------------------- |
| E    | 59-74%   | Endurance fondamentale |
| M    | 75-84%   | Allure marathon        |
| T    | 83-88%   | Seuil lactique (tempo) |
| I    | 95-100%  | Intervalles VO₂max     |
| R    | 105-120% | Répétitions vitesse    |

Pour dériver l'allure d'une zone :
1. Calculer le VO₂ cible = %zone × VDOT
2. Résoudre l'Équation 1 en inverse pour trouver `v` (vitesse) depuis VO₂ cible
3. Convertir `v` en allure (min/km)

### 1.3 Implémentations open source disponibles

| Projet                                                                                            | Langage     | Licence | Notes                               |
| ------------------------------------------------------------------------------------------------- | ----------- | ------- | ----------------------------------- |
| [mekeetsa/vdot](https://github.com/mekeetsa/vdot)                                                 | C/JS        | —       | Équations complètes Daniels-Gilbert |
| [christoph-phillips/daniels-calculator](https://github.com/christoph-phillips/daniels-calculator) | Node.js/NPM | MIT     | Module NPM, allures + équivalences  |
| [karalyndewalt/FastAsYouCan](https://github.com/karalyndewalt/FastAsYouCan)                       | JS          | —       | Générateur de plans Daniels         |
| [st3v/running-formulas-mcp](https://github.com/st3v/running-formulas-mcp)                         | TS          | —       | MCP server multi-méthodologies      |
| [tlgs/vdot](https://github.com/tlgs/vdot)                                                         | Python      | —       | TUI, maths détaillées               |

### 1.4 Licence et propriété intellectuelle

Les **formules de régression** sont publiées académiquement (Daniels & Gilbert, 1979) et sont dans le domaine public. Les **tables pré-calculées** du livre sont sous copyright Human Kinetics, mais comme on implémente les formules directement, aucun problème de licence.

---

## 2. Métriques de charge d'entraînement

### 2.1 TRIMP exponential (Banister, 1991)

**Formule exacte :**

```
TRIMPexp = Σ (Δt × HRr × 0.64 × e^(k × HRr))
```

Où :
- `Δt` = durée à une FC donnée (minutes)
- `HRr` = Heart Rate Reserve ratio = `(FC_exercice - FC_repos) / (FC_max - FC_repos)`
- `k` = **1.92** pour les hommes, **1.67** pour les femmes
- La somme porte sur chaque intervalle de temps (idéalement seconde par seconde si streams FC disponibles)

**Exemple concret :** Un homme avec FC_repos=50, FC_max=190, courant 40min à FC=155 :
- HRr = (155-50)/(190-50) = 0.75
- Facteur = 0.64 × e^(1.92 × 0.75) = 0.64 × e^1.44 = 0.64 × 4.22 = 2.70
- TRIMP = 40 × 0.75 × 2.70 = **81.0**

**Source :** Banister, E.W. (1991). *Modeling elite athletic performance.* In: Physiological Testing of Elite Athletes, Human Kinetics.

### 2.2 hrTSS (Heart Rate Training Stress Score)

Le hrTSS normalise le TRIMP par rapport à un effort de référence (1h au seuil lactique) :

```
hrTSS = (TRIMPexp_séance / TRIMPexp_1h_LTHR) × 100
```

Où `TRIMPexp_1h_LTHR` = TRIMP d'une heure passée exactement à la FC de seuil lactique (LTHR).

**Calcul de la référence :**
- HRr_LTHR = (LTHR - FC_repos) / (FC_max - FC_repos)
- TRIMPexp_1h_LTHR = 60 × HRr_LTHR × 0.64 × e^(k × HRr_LTHR)

**Précision :** Très bon pour les efforts steady-state, moins fiable pour les intervalles à effort très fluctuant (le lag de la FC fausse le calcul).

**Source :** Approche dérivée de TrainingPeaks, basée sur le TRIMP de Banister. Pas de papier académique dédié — c'est une adaptation industrielle.

### 2.3 rTSS (Running Training Stress Score)

Pour les coureurs **sans données FC** mais avec des données d'allure :

```
rTSS = IF² × durée_heures × 100
```

Où :
- `IF` (Intensity Factor) = `FTP / allure_session` (ratio des vitesses, pas des allures)
- `FTP` = Functional Threshold Pace = allure au seuil (~allure T de Daniels)

**Avec Normalized Graded Pace (NGP)** pour le terrain vallonné :
```
rTSS = (durée_sec × NGP × IF) / (FTP × 3600) × 100
```

**Lien avec VDOT :** L'allure T de Daniels ≈ FTP. On peut dériver le FTP directement du VDOT.

**Source :** TrainingPeaks / Coggan & Allen (adapté de la puissance cycliste au running).

### 2.4 Session RPE (Foster et al., 2001)

Le fallback le plus simple, toujours disponible :

```
Training Load (AU) = RPE × durée_minutes
```

Où :
- `RPE` = échelle de Borg modifiée CR-10 (0 à 10)
- Correspond au champ `perceivedEffort` déjà présent dans Sporty

**Validité :** 36 études ont validé la méthode. Corrélation significative avec les mesures objectives (HR, lactate). Moins précis que TRIMP/hrTSS mais **toujours disponible**.

**Échelle CR-10 modifiée (Foster) :**

| RPE | Description |
| --- | ----------- |
| 0   | Repos       |
| 1   | Très facile |
| 2   | Facile      |
| 3   | Modéré      |
| 4   | Assez dur   |
| 5   | Dur         |
| 6   | —           |
| 7   | Très dur    |
| 8   | —           |
| 9   | —           |
| 10  | Maximum     |

**Source :** Foster, C. et al. (2001). *A new approach to monitoring exercise training.* J Strength Cond Res, 15(1), 109-115.

### 2.5 Stratégie de cascade recommandée

```
Si streams FC disponibles (heartRateCurve) → TRIMPexp / hrTSS
  │
  ├─ Sinon, si allure + VDOT disponibles → rTSS
  │
  └─ Sinon → Session RPE (RPE × durée)
```

Le champ `sportMetrics.trimp` déjà calculé dans Sporty (Epic 11) utilise probablement TRIMPexp — **à vérifier l'implémentation existante**.

---

## 3. Modèle Fitness-Fatigue (Banister, 1975)

### 3.1 Formule du modèle

```
Performance(t) = p₀ + k₁ × Σ e^(-(t-s)/τ₁) × w(s) - k₂ × Σ e^(-(t-s)/τ₂) × w(s)
```

Simplification via moyennes mobiles exponentielles :

```
CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / τ₁
ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / τ₂
TSB(t) = CTL(t) - ATL(t)
```

### 3.2 Paramètres du modèle

| Paramètre | Nom                  | Valeur standard | Notes                                  |
| --------- | -------------------- | --------------- | -------------------------------------- |
| τ₁        | Constante fitness    | **42 jours**    | Décroissance lente de la forme acquise |
| τ₂        | Constante fatigue    | **7 jours**     | Décroissance rapide de la fatigue      |
| k₁        | Gain fitness         | Variable        | Amplitude de l'effet positif           |
| k₂        | Gain fatigue         | Variable        | Amplitude de l'effet négatif           |
| p₀        | Performance initiale | Variable        | Niveau de base                         |

### 3.3 Personnalisation des constantes — État de la recherche

**Consensus actuel :** Les valeurs 42/7 sont des **valeurs par défaut populaires** (TrainingPeaks, GoldenCheetah), mais la recherche montre qu'elles devraient être individualisées.

**Étude clé — Limitations (PMC, 2007) :**
> *"The use of general constants should be avoided since they do not account for interindividual differences and differences between training-load methods."*

**Approche Bayésienne (Peng et al., 2023) :**
Utilisation de priors informés à partir de valeurs publiées, puis fitting individuel via inférence bayésienne. Appliqué à un coureur de demi-fond national — les τ individuels variaient significativement par rapport aux standards.

**Recommandation pour Sporty (MVP) :**
1. **Démarrer avec τ₁=42, τ₂=7** (standard de l'industrie)
2. **Phase future :** fitting individuel après accumulation de 8-12 semaines de données (corrélation TSS → performance mesurée)
3. Les constantes k₁ et k₂ ne sont pas nécessaires pour le PMC simple (on utilise juste CTL/ATL/TSB sans prédiction de performance absolue)

### 3.4 Interprétation du TSB

| TSB       | État                     | Action recommandée               |
| --------- | ------------------------ | -------------------------------- |
| > +25     | Très frais, désentraîné  | Augmenter la charge              |
| +10 à +25 | Frais, prêt à performer  | Fenêtre de course                |
| -10 à +10 | Zone neutre              | Entraînement normal              |
| -10 à -30 | Fatigue modérée          | Charge d'entraînement productive |
| < -30     | Surentraînement possible | Réduire la charge                |

**Source :** Banister, E.W. et al. (1975). *A systems model of training for athletic performance.* Aust J Sports Med, 7, 57-61. Vulgarisé par Coggan/Allen (TrainingPeaks).

---

## 4. Plans d'entraînement — Structure Daniels

### 4.1 Les 4 phases de Daniels

| Phase  | Nom                            | Focus                           | Séances qualité         | Durée type |
| ------ | ------------------------------ | ------------------------------- | ----------------------- | ---------- |
| **FI** | Foundation & Injury Prevention | Base aérobie, renforcement      | E, strides              | 6 semaines |
| **EQ** | Early Quality                  | Introduction de la vitesse      | R + T occasionnel       | 6 semaines |
| **TQ** | Transition Quality             | Phase la plus dure, spécificité | I + T                   | 6 semaines |
| **FQ** | Final Quality                  | Affûtage, spécifique course     | T + M, réduction volume | 6 semaines |

**Plan standard = 24 semaines** (6 × 4 phases). Adaptable :
- 12 semaines → 3 × 4 phases
- 16 semaines → 4 × 4 phases
- 20 semaines → 5 × 4 phases

### 4.2 Structure hebdomadaire type

**3 séances qualité (Q) par semaine :**
- Q1 = Long run (dimanche typiquement)
- Q2 = Séance rapide #1 (mardi)
- Q3 = Séance rapide #2 (vendredi)

Les autres jours = Easy runs (E) ou repos.

### 4.3 Contenu par phase et distance cible

#### Exemple : Plan 10K (24 semaines)

| Phase | Q1 (Long)             | Q2            | Q3                 |
| ----- | --------------------- | ------------- | ------------------ |
| FI    | E long (progressif)   | E + strides   | E + strides        |
| EQ    | L (25-30% vol. hebdo) | R (200-400m)  | T (20-30min seuil) |
| TQ    | L avec finish T       | I (800-1200m) | T (tempo continu)  |
| FQ    | L réduit              | T (tempo)     | M/R léger          |

### 4.4 Règles de volume de Daniels

- **Long run :** max 25-30% du volume hebdomadaire
- **Intervalles I :** max 8% du volume hebdomadaire (ou 10km, le moins élevé)
- **Seuil T :** max 10% du volume hebdomadaire (ou 60min continu)
- **Répétitions R :** max 5% du volume hebdomadaire
- **Augmentation hebdo :** max +10% du volume par semaine
- **Semaine de récupération :** toutes les 3-4 semaines, réduire de 20-30%

### 4.5 Algorithmisation

Le processus de génération de plan peut se décomposer :

```
1. VDOT → Allures cibles (E, M, T, I, R)
2. Objectif + date → Nombre de semaines → Durée de chaque phase
3. Niveau + séances/semaine → Volume hebdomadaire cible
4. Phase → Types de séances qualité
5. Contraintes (jours préférés, durée max) → Placement des séances
6. Règles de volume → Validation et ajustement
```

**Projet de référence :** [FastAsYouCan](https://github.com/karalyndewalt/FastAsYouCan) — générateur de plans Daniels open source.

---

## 5. Boucle adaptative — Recalibration

### 5.1 Recherche sur l'adaptation automatique

**Étude clé — Adaptive Athlete Training Plan (ScienceDirect, 2021) :**
> L'adaptation de la charge d'entraînement est formulée comme un **problème de contrôle optimal** : minimiser l'écart entre l'objectif du plan et le résultat observé.

### 5.2 Seuils de recalibration recommandés

Pas de consensus académique strict, mais synthèse des approches :

| Delta prévu vs réalisé        | Action                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| **< ±10%**                    | Aucune action — variation normale                                      |
| **±10% à ±20%**               | Ajustement mineur — modifier les allures cibles de la semaine suivante |
| **> +20% (surperformance)**   | Réévaluer le VDOT à la hausse, ajuster les allures                     |
| **> -20% (sous-performance)** | Réduire la charge, vérifier fatigue/blessure                           |
| **Séance manquée**            | Reporter ou compenser (max 1 séance qualité décalée)                   |
| **2+ séances manquées**       | Recalibrer la phase restante                                           |

### 5.3 Réévaluation du VDOT

Conditions pour mettre à jour le VDOT automatiquement :
1. Séance de type **T, I ou course** (pas E/M/R)
2. Durée suffisante (> 12min pour T, > 3min pour I)
3. Allure soutenue significativement différente des allures cibles
4. **Ne réévaluer qu'à la hausse** dans un premier temps (à la baisse = potentiellement fatigue passagère)

### 5.4 Algorithme de recalibration

```
1. Séance complétée → calculer charge réelle (TRIMP/rTSS/RPE)
2. Comparer avec charge planifiée
3. Mettre à jour CTL/ATL/TSB
4. Si delta > seuil :
   a. Réévaluer VDOT si conditions remplies
   b. Recalculer les allures cibles
   c. Ajuster le volume des semaines restantes
   d. Conserver la structure des phases (ne pas sauter de phase)
5. Notifier l'utilisateur du changement
```

---

## 6. Modèle de taper (Mujika & Padilla, 2003)

### 6.1 Recommandations scientifiques

**Source :** Mujika, I. & Padilla, S. (2003). *Scientific bases for precompetition tapering strategies.* Med Sci Sports Exerc, 35(7), 1182-1187.

| Paramètre        | Recommandation          | Détail                             |
| ---------------- | ----------------------- | ---------------------------------- |
| **Volume**       | Réduire de **60-90%**   | Réduction progressive, pas brutale |
| **Intensité**    | **Maintenir**           | Ne PAS réduire l'intensité         |
| **Fréquence**    | Réduire de **max 20%**  | Garder le rythme des séances       |
| **Durée**        | **4 à 28 jours**        | Typiquement 2-3 semaines           |
| **Type**         | Progressif non-linéaire | Meilleur que step taper            |
| **Gain attendu** | **~3%** (range 0.5-6%)  | Statistiquement significatif       |

### 6.2 Modèle de taper progressif non-linéaire

```
Volume(jour) = Volume_normal × (1 - réduction_totale × (jour / durée_taper)^α)
```

Où `α` contrôle la forme de la courbe :
- α = 1 : linéaire
- α > 1 : réduction lente au début, rapide à la fin
- α < 1 : réduction rapide au début, plateau

**Recommandation :** α ≈ 1.5-2 (réduction progressive avec accélération)

### 6.3 Méta-analyse complémentaire (Bosquet et al., 2007)

**Source :** Bosquet, L. et al. (2007). *Effects of tapering on performance: a meta-analysis.* Med Sci Sports Exerc, 39(8), 1358-1365.

Confirme les findings de Mujika & Padilla. Le taper optimal :
- Dure **2 semaines** pour la plupart des athlètes récréatifs
- Produit des **améliorations significatives** en endurance, force et puissance

### 6.4 Implémentation pour Sporty

Phase `taper` dans la structure de plan :
- Réduire le volume de **40-60%** (plus conservateur pour athlètes récréatifs)
- Maintenir 2-3 séances/semaine avec des portions à allure I et T
- Durée : **10-14 jours** pour 5K-10K, **14-21 jours** pour semi/marathon

---

## 7. Méthodes et concepts complémentaires (recherche récente)

### 7.1 Modèles de distribution d'intensité — Au-delà du polarisé

La recherche récente (2024-2025) identifie **4 modèles** de distribution d'intensité (TID), pas 2 :

| Modèle                   | Distribution Z1/Z2/Z3 | Principe                                               |
| ------------------------ | --------------------- | ------------------------------------------------------ |
| **Polarisé (POL)**       | 80% / ~5% / ~15%      | Beaucoup de facile + du très dur, quasi rien au milieu |
| **Pyramidal (PYR)**      | 75% / 15% / 10%       | Décroissant progressif Z1 > Z2 > Z3                    |
| **Seuil (THR)**          | 50% / 40% / 10%       | Accent fort sur la zone 2 (seuil lactique)             |
| **High-Intensity (HIT)** | 40% / 20% / 40%       | Dominante haute intensité                              |

**Étude clé ML (Nature, 2025) :** Une étude machine learning sur des marathoniens a identifié **4 profils de répondeurs** :
- Répondeurs polarisés : **31.5%**
- Répondeurs pyramidaux : **31.9%**
- Double répondeurs : **18.7%**
- Non-répondeurs : **17.9%**

→ **Il n'y a pas de modèle universellement supérieur.** Le choix optimal dépend du profil individuel.

**Méta-analyse (Sports Medicine, 2024) :** Le polarisé produit des améliorations marathon supérieures (+11.3 ± 3.2 min vs +8.7 ± 2.8 min pour pyramidal), mais la différence n'est significative que pour des interventions < 12 semaines.

**Implication Sporty :** Le port `TrainingPlanEngine` doit supporter différents TID. Le MVP peut démarrer avec Daniels (qui est essentiellement pyramidal), puis ajouter polarisé (80/20 Fitzgerald) — l'architecture doit être TID-agnostique.

**Sources :**
- [Nature — ML-based personalized training models (2025)](https://www.nature.com/articles/s41598-025-25369-7)
- [PMC — Polarized vs Other TID meta-analysis (2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/)
- [Frontiers — Recent advances in TID theory (2025)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1657892/full)

### 7.2 Méthode norvégienne — Double Threshold guidé par le lactate

La méthode développée par le groupe d'entraînement norvégien (Ingebrigtsen, Heggen, etc.) est **LA tendance dominante** depuis 2022.

**Principes :**
- **2-4 séances au seuil/semaine** (vs 1-2 dans les approches classiques)
- **"Double threshold days"** : séance seuil matin + séance seuil après-midi
- Intensité guidée par **mesure lactate en temps réel** (2-4 mmol/L), pas par allure/FC
- Volume total élevé, mais **80% en zone facile** (compatible polarisé)
- Les intervalles au seuil visent le **maximal lactate steady state (MLSS)**

**Différence clé vs Daniels/80-20 :**
- Daniels : allures prescrites depuis VDOT (externe)
- Norvégien : intensité régulée par réponse lactate individuelle (interne)

**Revue systématique (2023) :** La méthode est validée pour les élites mais les données sur athlètes récréatifs restent limitées. L'absence de capteur lactate grand public est le frein principal à la démocratisation.

**Implication Sporty (MVP) :** Pas implémentable directement (nécessite mesure lactate). Mais la philosophie d'**ajuster l'intensité sur des marqueurs internes** plutôt qu'externes est pertinente pour la boucle de recalibration. À terme, l'intégration de capteurs lactate (Supersapiens, Lumen) pourrait ouvrir cette voie.

**Sources :**
- [SJSP — Norwegian double-threshold systematic review (2023)](https://sjsp.aearedo.es/index.php/sjsp/article/view/norwegian-double-threshold-method-distance-running)
- [PMC — Does LGTIT represent the "next step"? (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10000870/)
- [Marius Bakken — The Norwegian Model](https://www.mariusbakken.com/the-norwegian-model.html)
- [PMC — Training Session Models: Norwegian Perspective (2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11560996/)

### 7.3 DFA alpha1 — Détection de seuils par variabilité cardiaque

Méthode émergente pour détecter les seuils ventilatoires (VT1, VT2) **sans test en labo**, à partir d'un simple capteur de FC de poitrine.

**Principe :**
- `DFA α1` = exposant de fluctuation détrended de la série RR du cœur
- α1 > 1.0 → exercice basse intensité (corrélé, régulier)
- α1 ≈ 0.75 → **seuil aérobie (VT1)**
- α1 ≈ 0.5 → **seuil anaérobie (VT2)** (comportement aléatoire)
- α1 < 0.5 → haute intensité (anti-corrélé)

**Validation 2024 :**
- Fiabilité test-retest : ICC = 0.76-0.97 (bonne à excellente)
- Erreur typique : ~6-8 bpm aux seuils
- Utilisable avec un capteur thoracique grand public (Garmin, Polar, Wahoo)

**Implication Sporty :** Si les streams RR sont disponibles via Strava ou les fichiers FIT, on pourrait calculer DFA α1 pour :
1. **Détecter automatiquement les seuils** sans test formel
2. **Classifier l'intensité réelle** d'une séance (vs l'intensité planifiée)
3. **Valider/affiner le VDOT** via corrélation avec les seuils détectés

C'est une feature **post-MVP** mais architecturalement intéressante à prévoir dans le port `TrainingLoadCalculator`.

**Sources :**
- [AI Endurance — DFA alpha1 thresholds](https://aiendurance.com/blog/dfa-alpha-1-thresholds-from-heart-rate-variability)
- [Frontiers — Reliability and validity (2024)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2024.1329360/full)
- [Wiley — Exercise prescription at constant speeds (2024)](https://onlinelibrary.wiley.com/doi/full/10.1002/ejsc.12175)

### 7.4 ACWR — Ratio charge aiguë/chronique et prévention des blessures

Le ratio **Acute:Chronic Workload Ratio** étend le modèle Banister en ajoutant une dimension de **prévention des blessures**.

**Formule :**
```
ACWR = ATL / CTL  (ou charge semaine courante / moyenne 4 dernières semaines)
```

**Zones de risque (consensus 2024) :**

| ACWR      | Zone              | Risque blessure           |
| --------- | ----------------- | ------------------------- |
| < 0.80    | Sous-entraînement | Moyen (déconditionnement) |
| 0.80-1.30 | **Zone optimale** | **Faible**                |
| 1.30-1.50 | Danger            | Élevé                     |
| > 1.50    | Zone rouge        | Très élevé                |

**Nuances (méta-analyse 2025, 22 études) :**
- L'ACWR est **associé** au risque de blessure mais les preuves causales restent discutées
- Grande hétérogénéité dans les méthodes de calcul entre études
- Pour le running spécifiquement, la corrélation charge/blessure nécessite plus de validation

**Implication Sporty :** Calculable directement depuis CTL/ATL. Ajouter un **warning** dans l'UI quand ACWR > 1.30 lors de la planification ou après import d'une séance. Feature simple à forte valeur ajoutée.

**Sources :**
- [PMC — ACWR meta-analysis (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12487117/)
- [Science for Sport — ACWR guide](https://www.scienceforsport.com/acutechronic-workload-ratio/)

---

## 8. Cycle de consolidation / maintien — Entre les plans

### 8.1 Le problème : que faire hors plan ?

Les 4 phases de Daniels (FI→EQ→TQ→FQ) modélisent un cycle de préparation vers un objectif. Mais un coureur récréatif passe une **part significative de l'année** sans objectif immédiat :
- Après une course (récupération + transition)
- Entre deux cycles de préparation
- Hors saison (hiver, coupure estivale)
- Période sans objectif défini

La périodisation classique (Bompa, Matveyev) identifie **3 périodes** dans un macrocycle annuel :
1. **Préparatoire** (= phases FI→TQ de Daniels)
2. **Compétitive** (= phase FQ + course)
3. **Transition** (= récupération + maintien)

### 8.2 Phase de transition post-compétition

**Durée recommandée : 2-4 semaines** après l'objectif principal.

| Semaine | Contenu | Volume (% du pic) | Intensité |
| ------- | ------- | ------------------ | --------- |
| 1 | Repos actif : jogging léger, cross-training (vélo, natation, marche) | 20-30% | Zone E uniquement |
| 2 | Reprise easy runs, 3-4×/semaine | 30-40% | Zone E, quelques strides |
| 3 | Retour à la structure normale (E + 1 séance légère) | 40-50% | E + strides + fartlek libre |
| 4 | Transition vers maintien ou nouveau cycle FI | 50-60% | E + 1 séance qualité légère |

**Principes clés (Human Kinetics, Bompa) :**
- L'athlète **ne doit pas** commencer un nouveau cycle préparatoire sans récupération complète
- Le repos complet > 2 semaines est contre-productif (désentraînement)
- Maintenir **40-50% de la préparation physique générale** pendant la transition
- Privilégier la **récupération psychologique** autant que physique

**Adaptation par distance de course :**
- 5K-10K : 1-2 semaines de transition suffisent
- Semi-marathon : 2-3 semaines
- Marathon : 3-4 semaines (voire plus si premier marathon)

### 8.3 Science du désentraînement — Taux de perte

Les données scientifiques sur la perte de fitness guident la durée maximale acceptable sans stimulus structuré.

**Déclin du VO2max (méta-analyse PMC, 2022 ; Frontiers, 2023) :**

| Durée d'arrêt | Perte VO2max (entraînés) | Perte VO2max (récréatifs) | Mécanisme principal |
| -------------- | ------------------------ | ------------------------- | ------------------- |
| < 10 jours | Négligeable | Négligeable | — |
| 2 semaines | ~6-7% | ~4% | ↓ Volume d'éjection systolique |
| 4 semaines | ~10-12% | ~6-8% | ↓ Volume plasmatique + VO2 |
| 8 semaines | ~15-20% | ~10-14% | ↓ Densité capillaire + mitochondriale |
| > 12 semaines | Plateau (~20%) | Continue de baisser | Adaptations structurelles perdues |

**Asymétrie clé :** Les coureurs expérimentés (plusieurs années d'entraînement) **retiennent leur fitness plus longtemps** — les adaptations physiologiques deviennent plus "permanentes" avec le temps (mémoire musculaire, densité mitochondriale).

**Autres paramètres affectés :**
- **Économie de course** : relativement préservée jusqu'à 4 semaines
- **Seuil lactique** : chute significative dès 2-3 semaines
- **Force musculaire** : bien conservée jusqu'à 3-4 semaines

### 8.4 Le maintien minimal — Dose minimale efficace

**Découverte clé (Hickson et al., 1985 ; confirmé par méta-analyses récentes) :**

> On peut **réduire le volume de 60-90%** et la **fréquence de ~20%** tout en maintenant le VO2max, **à condition de maintenir l'intensité**.

| Paramètre | Réduction tolérable | Condition |
| ---------- | ------------------- | --------- |
| **Volume** | -60 à -70% | Intensité maintenue |
| **Fréquence** | -20 à -30% (min 2-3×/sem) | Au moins 1 séance intense/semaine |
| **Intensité** | **Ne pas réduire** | C'est le facteur critique |
| **Durée de séance** | -33 à -66% | Si intensité maintenue |

**Structure de semaine en maintien (synthèse) :**

| Jour | Séance type | Détail |
| ---- | ----------- | ------ |
| Mar | Séance qualité | T court (15-20min tempo) ou I court (3-4× 800-1000m) |
| Jeu | Easy run | 30-40min zone E |
| Sam | Long run réduit | 50-70min E, éventuellement avec strides |

→ **3 séances/semaine, 30-40% du volume pic, 1 séance intense** = dose minimale pour maintenir les acquis pendant 8-15 semaines.

### 8.5 Le plan Daniels "4-Week" comme outil de maintien

Daniels propose dans *Running Formula* un plan cyclique de 4 semaines (le "4Week plan") qui peut servir de **plan de maintien entre les cycles** :

- **Cycle de 4 semaines** : 3 semaines de charge + 1 semaine allégée (sans long run ni séance rapide)
- **2 séances structurées/semaine** : 1 long run + 1 séance de vitesse
- **Allures basées sur le VDOT actuel** (pas sur un objectif futur)
- **Sous-plans** adaptés au volume hebdomadaire et au niveau

Ce format est idéal pour Sporty car il est **algorithmisable** avec les mêmes briques que le plan principal (VDOT → allures, règles de volume) et assure une transition fluide vers un nouveau cycle FI quand l'utilisateur définit un nouvel objectif.

### 8.6 Modèle de states pour Sporty

L'athlète dans Sporty peut être dans l'un de ces états :

```
┌──────────────┐     objectif défini     ┌──────────────────┐
│  MAINTIEN    │ ──────────────────────→ │  PRÉPARATION     │
│  (4-Week)    │                          │  (FI→EQ→TQ→FQ)  │
└──────┬───────┘                          └────────┬─────────┘
       ↑                                           │
       │        ┌──────────────┐                   │ course terminée
       │        │  TRANSITION  │ ←─────────────────┘
       └────────│  (2-4 sem)   │
    récup finie └──────────────┘
```

**Règles de transition :**
- **Préparation → Transition** : automatique après la date de course
- **Transition → Maintien** : après 2-4 semaines (selon distance)
- **Maintien → Préparation** : quand l'utilisateur définit un nouvel objectif + date
- **Maintien (indéfini)** : le plan 4-Week tourne en boucle, VDOT réévalué périodiquement

### 8.7 Implications pour l'implémentation

| Aspect | Décision |
| ------ | -------- |
| **Modèle d'état** | L'athlète a un `trainingState` : `preparation`, `transition`, `maintenance` |
| **Plan de transition** | Généré automatiquement post-course, basé sur la distance courue |
| **Plan de maintien** | Cycles 4-Week Daniels, allures depuis VDOT courant |
| **Détection de désentraînement** | Si aucune séance > 14 jours → warning + proposition de plan de reprise |
| **Reprise** | Si inactivité > 4 semaines → VDOT réduit estimé, reprise par phase FI |
| **ACWR en maintien** | Continuer le suivi CTL/ATL/TSB, alerter si ACWR > 1.3 à la reprise |

**Sources :**
- [Human Kinetics — Link training periods with a transition phase](https://us.humankinetics.com/blogs/excerpt/link-training-periods-with-a-transition-phase)
- [PMC — Detraining meta-analysis VO2max (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9398774/)
- [Frontiers — Cardiorespiratory consequences of detraining (2023)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1334766/full)
- [PubMed — Reduced volume maintains aerobic capacity (Hickson, 1985)](https://pubmed.ncbi.nlm.nih.gov/8440543/)
- [Fellrnr — Jack Daniels 4-Week plan](https://fellrnr.com/wiki/Jack_Daniels_Running_Formula-4Week)
- [Outside Online — Minimum training dose](https://www.outsideonline.com/health/training-performance/minimum-training-dose-research/)
- [Runners Connect — Losing running fitness](https://runnersconnect.net/losing-running-fitness/)
- [TrainingPeaks — Detraining](https://www.trainingpeaks.com/blog/how-much-down-time-is-too-much-the-concept-of-detr/)
- [Frontiers — Detraining/retraining case study (2024)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2024.1508642/full)

---

## 9. Synthèse — Décisions d'implémentation

### 9.1 Réponses aux questions ouvertes du document de cadrage

| #   | Question                                | Réponse                                                                                                                                    |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Tables VDOT sous licence libre ?        | **Les formules de régression sont publiées et libres.** Implémenter les 2 équations de Daniels-Gilbert directement. Pas besoin des tables. |
| 2   | Algorithme exact hrTSS ?                | **TRIMPexp normalisé par 1h à LTHR.** Formule complète documentée ci-dessus.                                                               |
| 3   | Constantes Banister personnalisables ?  | **Démarrer avec τ₁=42, τ₂=7.** Personnalisation future via fitting individuel après 8-12 semaines de données.                              |
| 4   | Structures de semaine Daniels ?         | **4 phases (FI/EQ/TQ/FQ), 3 qualité/semaine.** Contenu par phase et distance documenté. Templates algorithmisables.                        |
| 5   | Tolérance de delta pour recalibration ? | **±10% = OK, ±20% = ajustement mineur, >20% = recalibration.** Pas de consensus académique — valeurs pragmatiques.                         |
| 6   | Multi-sport MVP ?                       | **Running-only** pour le MVP. L'abstraction `TrainingPlanEngine` permet d'étendre sans refactor.                                           |
| 7   | Modèle de taper ?                       | **Mujika & Padilla : -40 à -60% volume, maintenir intensité, 2-3 semaines, progressif non-linéaire.**                                      |

### 9.2 Stack de formules pour l'implémentation

```
┌─────────────────────────────────────────────┐
│            COUCHE PRÉSENTATION              │
│  Allures (min/km) · Charge (score) · TSB    │
├─────────────────────────────────────────────┤
│            COUCHE CALCUL                    │
│                                             │
│  VDOT ← Daniels-Gilbert (2 régressions)    │
│  Allures ← VDOT × %zone (E/M/T/I/R)       │
│  TRIMP ← Banister exp (FC, durée, sexe)    │
│  rTSS ← IF² × durée (allure vs FTP)        │
│  RPE Load ← RPE × durée                    │
│  CTL/ATL ← EMA(TSS, τ₁=42 / τ₂=7)         │
│  TSB ← CTL - ATL                           │
│                                             │
├─────────────────────────────────────────────┤
│            COUCHE PLANIFICATION             │
│                                             │
│  Plan ← Objectif + VDOT + Contraintes      │
│  Phases ← FI → EQ → TQ → FQ (+ Taper)     │
│  Séances ← 3Q/sem + E/repos                │
│  Recalib ← Delta > seuil → ajuster         │
│  Taper ← Mujika (-40-60% vol, keep int.)   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Références bibliographiques

1. Banister, E.W. et al. (1975). *A systems model of training for athletic performance.* Australian Journal of Sports Medicine, 7, 57-61.
2. Banister, E.W. (1991). *Modeling elite athletic performance.* In: Physiological Testing of Elite Athletes, Human Kinetics.
3. Bosquet, L. et al. (2007). *Effects of tapering on performance: a meta-analysis.* Medicine & Science in Sports & Exercise, 39(8), 1358-1365.
4. Daniels, J. & Gilbert, J. (1979). *Oxygen Power: Performance Tables for Distance Runners.*
5. Daniels, J. (2022). *Daniels' Running Formula.* 4th edition, Human Kinetics.
6. Foster, C. et al. (2001). *A new approach to monitoring exercise training.* Journal of Strength and Conditioning Research, 15(1), 109-115.
7. Fitzgerald, M. (2014). *80/20 Running.* Penguin Books.
8. Lydiard, A. (2011). *Running to the Top.* Meyer & Meyer Sport.
9. Mujika, I. & Padilla, S. (2003). *Scientific bases for precompetition tapering strategies.* Medicine & Science in Sports & Exercise, 35(7), 1182-1187.
10. Peng et al. (2023). *Bayesian inference of the Banister impulse-response model.* SportRxiv preprint.
11. Pfitzinger, P. & Douglas, S. (2019). *Advanced Marathoning.* 3rd edition, Human Kinetics.
12. Seiler, S. (2010). *What is best practice for training intensity and duration distribution?* IJSPP, 5(3), 276-291.
13. Filipas, L. et al. (2022). *Effects of 16 weeks of pyramidal and polarized training intensity distributions in well-trained endurance runners.* Scand J Med Sci Sports, 32(3).
14. Kelemen et al. (2023). *The Norwegian double-threshold method in distance running: Systematic literature review.* SJSP.
15. Gronwald, T. et al. (2024). *Correlation properties of heart rate variability for exercise prescription during prolonged running.* Eur J Sport Sci.
16. Frontiers in Physiology (2024). *Reliability and validity of DFA α1 to determine intensity thresholds.*
17. Nature Scientific Reports (2025). *Machine learning-based personalized training models for optimizing marathon performance through pyramidal and polarized TID.*
18. PMC (2025). *Acute to chronic workload ratio for predicting sports injury risk: a systematic review and meta-analysis.*
19. Frontiers in Physiology (2025). *Recent advances in training intensity distribution theory for cyclic endurance sports.*

## Sources web consultées

- [mekeetsa/vdot — Formules Daniels-Gilbert](https://github.com/mekeetsa/vdot)
- [christoph-phillips/daniels-calculator — NPM module](https://github.com/christoph-phillips/daniels-calculator)
- [karalyndewalt/FastAsYouCan — Plan generator](https://github.com/karalyndewalt/FastAsYouCan)
- [st3v/running-formulas-mcp — MCP server](https://github.com/st3v/running-formulas-mcp)
- [Fellrnr — TRIMP et quantification](https://fellrnr.com/wiki/TRIMP)
- [Fellrnr — Modélisation performance](https://fellrnr.com/wiki/Modeling_Human_Performance)
- [Fellrnr — Jack Daniels](https://fellrnr.com/wiki/Jack_Daniels)
- [TrainingPeaks — rTSS Explained](https://www.trainingpeaks.com/learn/articles/running-training-stress-score-rtss-explained/)
- [TrainingPeaks — Science of Performance Manager](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/)
- [TrainingPeaks — TSS vs hrTSS](https://www.trainingpeaks.com/learn/articles/training-with-tss-vs-hrtss-whats-the-difference/)
- [PMC — Limitations of Banister model](https://pmc.ncbi.nlm.nih.gov/articles/PMC1974899/)
- [PMC — Session-RPE validity](https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/)
- [ScienceDirect — Adaptive Training Plan](https://www.sciencedirect.com/science/article/pii/S1440244021004679)
- [Mujika & Padilla 2003 — PDF](http://robin.candau.free.fr/Mujika_Padilla.pdf)
- [Simpson Associates — Daniels/Gilbert Formula](http://www.simpsonassociatesinc.com/runningmath1.htm)
- [CoachRay — Daniels Periodisation](https://www.coachray.nz/2021/10/11/jack-daniels-phd-formulaic-approach-to-periodisation/)
- [Foster 2001 — Original paper PDF](https://paulogentil.com/pdf/A%20New%20Approach%20to%20Monitoring%20Exercise%20Training.pdf)
