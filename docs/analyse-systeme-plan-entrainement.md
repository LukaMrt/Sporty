# Analyse du système de plan d'entraînement

> Périmètre : moteur Daniels (`app/services/training/daniels_plan_engine.ts`), use cases `app/use_cases/planning/`, listeners, repositories, validators, controllers et pages Inertia associées.
> Date : 2026-07-13

> **Statut : corrigé.** L'ensemble des points ci-dessous (C1-C7, M1-M11 et les
> points mineurs, à l'exception de la matérialisation du profil de forme et du
> renommage du listener) a été corrigé le 2026-07-13 sur cette branche. Les
> numéros de ligne cités ci-dessous se réfèrent au code _avant_ correctifs —
> le document est conservé comme trace de l'audit.

## Synthèse

L'architecture est saine (Clean Architecture bien respectée, ports abstraits, moteur pur et testable, bonne couverture de tests unitaires). En revanche, **la boucle de recalibration automatique — la fonctionnalité phare du module — est entièrement morte en production** à cause d'un champ jamais renseigné (`targetLoadTss`), et le moteur de recalibration contient un décalage d'une semaine qui **supprime toutes les séances de la dernière semaine du plan** (celle de la course). Plusieurs incohérences de convention de jours et de cycle de vie de l'objectif complètent le tableau.

Classement : 🔴 critique (comportement cassé ou perte de données) · 🟠 moyen (bug réel mais impact limité ou cas particulier) · 🟡 mineur / dette.

---

## 1. Bugs critiques

### 🔴 C1 — La recalibration automatique ne se déclenche jamais (`targetLoadTss` toujours `null`)

`RecalibratePlan` calcule le delta de charge à partir de `plannedLoadTss`, somme des `targetLoadTss` des séances planifiées (`app/listeners/update_fitness_profile_listener.ts:63`). Or **aucun code ne renseigne jamais `targetLoadTss`** : les 7 points d'insertion de séances planifiées passent tous `targetLoadTss: null` (`generate_plan.ts:214`, `recalibrate_plan.ts:179`, `handle_vdot_down_proposal.ts:103`, `resume_from_inactivity.ts:100`, `generate_maintenance_plan.ts:99`, `generate_transition_plan.ts:108`, `get_plan_overview.ts:198`).

Conséquence en chaîne dans `recalibrate_plan.ts:59-62` :

```
plannedLoadTss = 0  →  delta = 0  →  |delta| < 0.1  →  return
```

Sont donc **morts en production** :

- la réévaluation VDOT à la hausse (étape 5a) ;
- la réduction de charge sur delta négatif (étape 5b) ;
- la proposition de baisse VDOT (étape 5c) — `pendingVdotDown` n'est jamais écrit, donc le dialogue `RecalibrationDialog` et le chemin « confirm » de `HandleVdotDownProposal` sont inatteignables ;
- la régénération des semaines restantes et l'événement `plan:vdot_increased`.

Seul le report de séance qualité manquée (`#deferMissedQualitySession`, appelé avant le early-return) fonctionne.

**Correctif suggéré :** calculer un TSS cible à la génération (le moteur connaît durée, allure cible et zone — un rTSS prévisionnel `IF² × durée × 100` est direct avec `TrainingLoadCalculatorImpl`), ou baser le delta sur les minutes planifiées vs réalisées en attendant.

### 🔴 C2 — Décalage d'une semaine dans `DanielsPlanEngine.recalibrate()` : la dernière semaine du plan perd toutes ses séances

Le moteur numérote les semaines régénérées à partir de `currentWeekNumber` (`daniels_plan_engine.ts:482` : `weekNumber = currentWeekNumber + i`), alors que tous les appelants lui passent des `remainingWeeks` qui commencent à `currentWeekNumber + 1` et remplacent les semaines `>= currentWeekNumber + 1` :

- `recalibrate_plan.ts:108,165-167`
- `handle_vdot_down_proposal.ts:49,89-91`
- `resume_from_inactivity.ts:39,86-88`

Avec `remainingCount` semaines restantes `[cw+1 … totalWeeks]`, le moteur génère `[cw … totalWeeks−1]`. L'appelant :

1. supprime les séances des semaines `[cw+1 … totalWeeks]` (`deleteSessionsFromWeek`) ;
2. filtre `weeks.filter(w => w.weekNumber >= cw+1)` → ne réinsère que `[cw+1 … totalWeeks−1]`.

**La semaine `totalWeeks` — la semaine de course — est vidée et jamais recréée.** Le chemin est atteignable dès aujourd'hui via `POST /planning/resume-from-inactivity`, et le sera par `RecalibratePlan` et `HandleVdotDownProposal` dès que C1 sera corrigé. Par ricochet, tous les volumes hebdomadaires sont décalés d'une semaine (la semaine `cw+1` reçoit le volume calculé pour `cw`).

**Correctif suggéré :** dans le moteur, générer à partir de `remainingWeeks[0].weekNumber` (ou passer explicitement `firstRemainingWeekNumber` dans `RecalibrationContext`), et ajouter un test « chaque semaine restante a encore des séances après recalibration ».

### 🔴 C3 — La réduction de charge (−20 %) est un no-op

`RecalibratePlan` applique `loadFactor = 0.85` au `currentWeeklyVolumeMinutes` de l'`originalRequest` (`recalibrate_plan.ts:138,155-157`). Mais le moteur ignore cette valeur dès qu'il y a des semaines restantes :

```ts
// daniels_plan_engine.ts:467-468
const startVolume =
  remainingWeeks[0]?.targetVolumeMinutes ?? originalRequest.currentWeeklyVolumeMinutes
```

`remainingWeeks[0]` existe toujours dans ce chemin (sinon on a retourné plus tôt), donc le facteur 0,85 n'a **aucun effet**. `ResumeFromInactivity` contourne le problème en pré-multipliant lui-même les volumes des semaines (`resume_from_inactivity.ts:51`) — c'est l'indice que le contrat du moteur est ambigu. À unifier : soit le moteur honore `currentWeeklyVolumeMinutes`, soit les appelants modifient les `remainingWeeks`.

### 🔴 C4 — Conventions de jour de semaine incohérentes

La convention officielle est `0=dimanche … 6=samedi` (JS `Date.getDay()`, validée `min(0).max(6)` dans `generate_plan_validator.ts:7`, affichée via `DAY_ORDER = [1,2,3,4,5,6,0]` dans `Planning/Index.tsx:20`). Trois endroits la violent :

1. **Padding des jours dans le moteur** (`daniels_plan_engine.ts:644-648`) : la boucle `for (d = 1; d <= 7; …)` peut produire `dayOfWeek = 7` (ex. `preferredDays = [1..6]` et `sessionsPerWeek = 7`, le dimanche `0` n'étant jamais ajouté). Une séance `dayOfWeek: 7` est invisible côté frontend (`DAY_ORDER.indexOf(7) === -1`, `find(s => s.dayOfWeek === dow)` ne la trouve jamais).
2. **Choix du jour de sortie longue** (`daniels_plan_engine.ts:655`) : `longRunDay = days[days.length−1]` après tri numérique croissant. Le dimanche vaut `0` et se retrouve _premier_ : un utilisateur qui coche dimanche pour sa sortie longue (le cas le plus courant) obtient sa sortie longue le samedi (ou pire, un mardi si ses jours sont `[0,2,4]` → sortie longue le jeudi `4`). Le tri doit se faire dans l'ordre chronologique du plan (semaine démarrant lundi) : `[1,2,3,4,5,6,0]`.
3. **Calcul de date dans `#deferMissedQualitySession`** (`recalibrate_plan.ts:256-258`) : `sessionDate = start + (week−1)×7 + dayOfWeek` est incompatible avec la formule de référence `(dayOfWeek − startDow + 7) % 7` utilisée par `GetNextSession.#absoluteDate` et `Planning/Index.tsx:23`. Pour un plan démarrant lundi : une séance du lundi (`1`) est datée mardi, une séance du dimanche (`0`) est datée le lundi _précédent_ — la détection « séance manquée » est donc fausse d'un à six jours.

### 🔴 C5 — L'objectif n'est jamais marqué `achieved` ; fin de cycle de vie incohérente

Aucun code ne passe un `TrainingGoal` au statut `achieved` (seul `abandoned` existe, via `AbandonGoal`). Quand `GetPlanOverview` détecte la fin du plan, il marque le plan `Completed` (`get_plan_overview.ts:77`) mais laisse l'objectif `active`. Conséquences :

- `CreateGoal` lève `ActiveGoalExistsError` : **l'utilisateur qui a terminé son plan ne peut pas créer de nouvel objectif** sans abandonner manuellement l'ancien (le flux « nouveau plan » passe par `abandonForNewPlan`, qui marque l'objectif atteint comme… abandonné — l'historique devient mensonger).
- L'enum `GoalStatus` (`planning_types.ts:36-40` : `Active/Achieved/Missed`) et le type `TrainingGoalStatus` (`training_goal.ts:1` : `'active'|'achieved'|'abandoned'`) divergent — deux vocabulaires pour le même concept, aucun n'est complètement utilisé.

**Correctif suggéré :** à la complétion du plan, marquer l'objectif `achieved` (ou `missed` selon la perf le jour de course), et unifier les deux types.

### 🔴 C6 — Aucune transaction sur les écritures multi-tables

La génération d'un plan enchaîne 1 insert plan + N inserts semaines + M inserts séances séquentiels (`generate_plan.ts:171-220`), sans transaction. Un échec au milieu laisse un plan `active` partiel qui **bloque toute régénération** (`ActivePlanExistsError`) sans être utilisable. Pire pour la recalibration : `deleteSessionsFromWeek` puis inserts (`recalibrate_plan.ts:165-184`) — un crash entre les deux détruit définitivement les semaines restantes. Idem `handle_vdot_down_proposal.ts`, `resume_from_inactivity.ts`, `generate_maintenance_plan.ts`, `generate_transition_plan.ts`, `get_plan_overview.ts` (régénération maintenance).

**Correctif suggéré :** exposer une notion d'unité de travail dans le port (`TrainingPlanRepository.createPlanGraph(plan, weeks, sessions)` implémentée avec `db.transaction()` côté Lucid, ou méthode `replaceSessionsFromWeek` atomique). Bonus : insertion batch (`createMany`) au lieu de M requêtes.

### 🔴 C7 — La date de course n'a aucune influence sur le calendrier du plan

- `planDurationWeeks` est choisi librement par l'utilisateur (`generate_plan_validator.ts:8`, min 8, sans max) et `startDate` = lundi prochain : **rien ne garantit que le plan se termine le jour de l'événement**. Le taper (`daniels_plan_engine.ts:410-418`) est calé sur la fin du plan, pas sur la course — un plan de 12 semaines pour une course dans 16 semaines fait « taperer » l'athlète un mois trop tôt.
- Aucune séance `SessionType.Race` n'est générée le jour J (l'enum existe, `intensityForSession` la gère, mais le moteur ne la produit jamais).
- `targetTimeMinutes` de l'objectif n'est utilisé nulle part : ni contrôle de faisabilité (temps cible vs prédiction VDOT), ni influence sur les allures.

**Correctif suggéré :** dériver `totalWeeks` de `eventDate` (ou au minimum contraindre/avertir), placer le taper par rapport à `eventDate`, générer la séance Race, et afficher un verdict de faisabilité temps-cible vs VDOT.

---

## 2. Bugs moyens

### 🟠 M1 — Deux plans actifs possibles

`GenerateMaintenancePlan` et `GenerateTransitionPlan` ne vérifient pas l'absence de plan actif avant de créer le leur (contrairement à `GeneratePlan`). La régénération automatique dans `GetPlanOverview.#regenerateMaintenanceCycle` est également non idempotente (deux requêtes concurrentes sur `GET /planning` peuvent créer deux cycles). Ni contrainte DB (pas d'index unique partiel sur `(user_id) WHERE status='active'` dans `1774256724286_create_training_plans_table.ts`), ni `orderBy` dans `findActiveByUserId` (`lucid_training_plan_repository.ts:44-50`) : avec deux plans actifs, `.first()` devient non déterministe.

### 🟠 M2 — Modèle de volume : progression sans plafond et cas « volume 0 »

- `#calculateWeeklyVolumes` applique +10 %/semaine composés sur toute la durée (`daniels_plan_engine.ts:613-631`) sans **plafond de pic**. Sur 16 semaines à partir de 300 min, on dépasse 600 min/sem ; sur 24 semaines c'est absurde. Daniels plafonne le volume selon le niveau — il manque un `maxWeeklyVolume` (fonction du VDOT ou de la distance cible).
- `MIN_BASE_VOLUME_MINUTES['5k'] = 0` (`generate_plan.ts:43-48`) : un débutant sans historique obtient `effectiveVolume = 0` → toutes les semaines à 0 min, sortie longue de **0 minute**, easy forcés à 20 min par le `Math.max(20, …)`. Il faut un plancher (ex. 60-90 min) pour le 5 km aussi.
- Les caps (`MAX_EASY_SESSION_MINUTES = 90`, long run ≤ 180) tronquent sans redistribuer : la somme des séances peut s'écarter sensiblement du `targetVolumeMinutes` affiché sur la semaine.

### 🟠 M3 — `GET /planning` a des effets de bord lourds

`GetPlanOverview.execute` marque des plans `Completed` et **crée des plans entiers** (boucle maintenance) pendant une requête GET (`get_plan_overview.ts:69-80`). En plus du problème d'idempotence (M1), `PlanningController.weekDetail` rappelle `getPlanOverview.execute` à chaque appel (`planning_controller.ts:68`) — la page de détail déclenche donc potentiellement les mêmes mutations. Extraire la transition de fin de plan dans un use case dédié déclenché explicitement (ou verrouillé).

### 🟠 M4 — Après recalibration, les `planned_weeks` ne sont pas mises à jour

`RecalibratePlan`, `HandleVdotDownProposal` et `ResumeFromInactivity` remplacent les **séances** mais jamais les lignes `planned_weeks` : `targetVolumeMinutes` et `isRecoveryWeek` affichés dans l'UI restent ceux d'origine, alors que les séances recréées suivent les nouveaux volumes du moteur. L'écran hebdomadaire devient incohérent (somme des séances ≠ volume affiché).

### 🟠 M5 — Report de séance qualité manquée fragile

`#deferMissedQualitySession` (`recalibrate_plan.ts:241-279`) :

- peut reporter vers `currentWeek + 1` même si c'est au-delà de la dernière semaine → séance fantôme jamais affichée ;
- choisit `freeDays[0]` sans tenir compte de l'espacement (peut coller la séance qualité la veille/lendemain d'une autre qualité ou de la sortie longue) ;
- la semaine suivante peut se retrouver avec 3 séances qualité (2 générées + 1 reportée), contredisant la règle « max 2 » du moteur ;
- ne marque pas la séance source comme déplacée (pas de trace, `status` reste `pending`).

### 🟠 M6 — Réévaluation VDOT à la hausse : estimation trop optimiste

`#getBestQualityPace` (`recalibrate_plan.ts:281-291`) prend la **meilleure allure moyenne de n'importe quelle séance ≥ 3 km des 12 dernières semaines** (y compris footings avec segments rapides, séances courtes de 3 km) et l'extrapole comme une performance de 5 000 m (`calculateVdot(5000, 5000/bestPace)`). Une séance de 3 km rapide surestime le VDOT (extrapoler 3→5 km à allure constante est favorable au coureur). Restreindre aux séances liées à des séances qualité complétées, et corriger l'extrapolation (Riegel ou utiliser la distance réelle). Au passage, la variable `bestPaceMs` est en m/min, pas en ms.

### 🟠 M7 — Intégrité des liaisons séance planifiée ↔ séance réalisée

`LinkCompletedSession` ne vérifie ni que la date de la séance réalisée correspond (même approximativement) à la semaine planifiée, ni qu'une même séance réalisée n'est pas déjà liée à une autre séance planifiée (double comptage dans les bilans). `AdjustPlan` autorise la modification d'une séance déjà `completed` et le déplacement sur un jour déjà occupé.

### 🟠 M8 — `days_since` fourni par le client

`POST /planning/resume-from-inactivity` accepte `days_since` du client (`inactivity_validator.ts`, `InactivityBanner.tsx:28`) et s'en sert pour réduire le VDOT jusqu'à −15 % et le volume à 60 %. La valeur est connue du serveur (`GetPlanOverview.#computeInactivity`) : la recalculer côté serveur éviterait une incohérence (bannière affichée sur une donnée, action exécutée sur une autre) et toute manipulation.

### 🟠 M9 — Faiblesses d'`EstimateVdot`

- Filtre `s.sportId === profile?.sportId` (`estimate_vdot.ts:89`) : profil absent ou sans sport ⇒ aucune séance éligible ⇒ retombée silencieuse sur VMA/questionnaire même avec un bel historique Strava.
- `findAllByUserId(perPage: 100)` puis filtre 6 semaines : un utilisateur avec > 100 séances récentes (multi-sports) voit son historique course tronqué arbitrairement. Utiliser `findByUserIdAndDateRange` comme ailleurs.
- `vdot` retourné arrondi à l'entier mais `paceZones` dérivées du VDOT non arrondi : les zones affichées ne correspondent pas exactement au VDOT affiché.
- Limite de conception (à documenter dans l'UI) : `vdotFromHistory` traite l'allure moyenne de footings comme des performances maximales — même au P90, le VDOT est structurellement sous-estimé pour les coureurs qui ne font que de l'easy.

### 🟠 M10 — Dates en UTC partout

`todayIso()`, `nextMondayIso()`, `#computeCurrentWeek`, `#absoluteDate`… mélangent heure locale serveur et `toISOString()` (UTC). Un utilisateur (ou serveur) dans un fuseau à l'ouest voit le « lundi prochain », la « semaine courante » ou le « aujourd'hui » basculer un jour trop tôt/tard en soirée. Le frontend calcule de son côté en local (`Planning/Index.tsx`) : les deux peuvent diverger sur la même séance (badge « aujourd'hui » vs `isToday` serveur de `GetNextSession`).

### 🟠 M11 — `SessionType.MarathonPace` exclu des séances « qualité »

`QUALITY_SESSION_TYPES` / `QUALITY_TYPES` (définis en **trois exemplaires** : `recalibrate_plan.ts:30,209`, `update_fitness_profile_listener.ts:77`) ne contiennent que Tempo/Interval/Repetition. Les séances allure marathon — centrales pour les plans semi/marathon en phases TQ/FQ — ne sont ni comptées dans le bilan qualité, ni reportées si manquées, ni prises en compte dans la détection « sous cible ».

---

## 3. Points mineurs et dette technique

- 🟡 **Branche morte** : `GetNextSession` teste `plan.status === PlanStatus.Completed` (`get_next_session.ts:19`) alors que `findActiveByUserId` ne retourne que `active|draft` — inatteignable. De même, `PlanStatus.Draft` n'est jamais créé nulle part.
- 🟡 **Nom trompeur** : `UpdateFitnessProfileListener` ne met à jour aucun profil de forme — il ne fait que détecter la fin de semaine et émettre `week:completed`. Le CTL/ATL est recalculé à la volée à chaque affichage sur 365 jours de séances (`get_plan_overview.ts:109-115`) : coûteux et re-calculé pour chaque GET. Envisager une matérialisation (table `fitness_snapshots`) mise à jour par ce listener, ce qui justifierait son nom.
- 🟡 **N+1 et boucles séquentielles** : `#computeWeekSummary` fait un `findById` par séance dans une boucle (`update_fitness_profile_listener.ts:88`) ; `GetPlanHistory` boucle plan par plan ; toutes les insertions de séances sont unitaires (jusqu'à ~100 requêtes pour un plan de 16 semaines).
- 🟡 **Duplications** : `todayIso`/`addWeeks` copiés dans 4 fichiers ; `MAINTENANCE_RATIO` dans 2 ; la construction `GeneratedWeek[]` depuis les entités + la boucle de persistance des semaines/séances copiées-collées dans 5 use cases (candidat évident à un service partagé) ; `sessionDate` dupliqué front (`Index.tsx`) / back (`get_next_session.ts`) — avec le bug C4-3 qui montre le risque de la duplication.
- 🟡 **`phaseLabel` = `phaseName`** à la création (`generate_plan.ts:197`) : la colonne n'apporte rien, le frontend traduit via i18n de toute façon.
- 🟡 **Validators** : `plan_duration_weeks` sans borne max (min 8 → un plan de 500 semaines est accepté) ; pas de `distinct()` sur `preferred_days` (doublons possibles → deux séances le même jour) ; pas de cohérence imposée `preferred_days.length >= sessions_per_week` (le padding du moteur — bogué, cf. C4 — sert de filet) ; `target_distance_km` sans max (1 000 km → catégorie marathon).
- 🟡 **`ResumeFromInactivity` sans garde-fou** : pas de vérification que `pendingVdotDown` ou une inactivité réelle existe ; POST rejouable à volonté, chaque appel réduit le VDOT de 3-15 % supplémentaires (cumulatif, plancher 30).
- 🟡 **`intervals` des strides** (`daniels_plan_engine.ts:227-240`) : 6×100 m ajoutés à une séance easy sans être décomptés du volume ; `durationMinutes: 0.33` s'affichera mal si l'UI formate en minutes entières.
- 🟡 **`formatPace`** : `Math.round` peut produire `5:60` (ex. pace 5.999 → mins 5, secs 60). Arrondir avant décomposition.
- 🟡 **`#getBestQualityPace`/`vdotFromHistory`** ignorent le dénivelé et les pauses (allure brute distance/durée) — acceptable en V1, à noter.
- 🟡 **Tests** : bonne couverture unitaire (moteur, use cases, listeners) mais aucun test n'attrape C1/C2 parce qu'ils mockent le repo et fournissent des `targetLoadTss` non nuls / ne vérifient pas la dernière semaine. Ajouter : un test d'intégration « une semaine complétée déclenche une recalibration effective » et un invariant « après recalibration, toutes les semaines restantes ont des séances ».

---

## 4. Recommandations priorisées

| #   | Action                                                                                                           | Corrige | Effort  |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| 1   | Renseigner `targetLoadTss` à la génération (rTSS prévisionnel)                                                   | C1      | Moyen   |
| 2   | Corriger le décalage de semaine dans `recalibrate()` + test d'invariant                                          | C2      | Faible  |
| 3   | Unifier la convention de jours (tri chronologique `[1..6,0]`, padding sans `7`, formule de date unique partagée) | C4      | Faible  |
| 4   | Envelopper les créations/remplacements de plan dans des transactions + inserts batch                             | C6      | Moyen   |
| 5   | Marquer l'objectif `achieved` en fin de plan, unifier `GoalStatus`/`TrainingGoalStatus`                          | C5      | Faible  |
| 6   | Caler durée du plan et taper sur `eventDate`, générer la séance Race, exploiter `targetTimeMinutes`              | C7      | Élevé   |
| 7   | Clarifier le contrat volume du moteur (`startVolume` vs `loadFactor`)                                            | C3      | Faible  |
| 8   | Garde « plan actif existant » + index unique partiel en DB                                                       | M1      | Faible  |
| 9   | Plafond de volume hebdo + plancher 5 km                                                                          | M2      | Faible  |
| 10  | Sortir les transitions de fin de plan du GET                                                                     | M3      | Moyen   |
| 11  | Mettre à jour les `planned_weeks` lors des recalibrations                                                        | M4      | Faible  |
| 12  | Inclure `MarathonPace` dans les types qualité (constante partagée unique)                                        | M11     | Trivial |

Les items 1-3 forment le socle : sans eux, la promesse « plan adaptatif » du module n'est pas tenue et les recalibrations existantes (reprise d'inactivité) sont destructrices.
