# Plan d'implémentation — Natation, GPX a posteriori, aide aux métriques

Branche : `feat/natation`
Périmètre :

- **A. Natation**, de bout en bout : import open-wearables, saisie manuelle, affichage, analyses, stats, charge (CSS/sTSS).
- **B. Ajout d'un GPX** à une séance déjà importée.
- **C. Aide contextuelle** sur les notions et acronymes introduits par l'audit (#22).

**Strava n'est pas modifié.** Son mapping `Swim → swimming` existe déjà et profitera de l'ajout du sport en base sans autre changement.

## Décisions actées

| Sujet                            | Décision                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unité d'allure natation          | **Toujours min/100 m**, indépendamment de la préférence `speedUnit`                            |
| Distance en saisie manuelle      | Champ en **mètres** quand le sport est la natation ; stockage inchangé en km (`distanceKm`)    |
| Totaux du dashboard et des stats | Voir §A.4 : durée et charge restent globales ; la distance est **toujours affichée par sport** |
| Phase CSS/sTSS                   | Incluse dans cette branche                                                                     |

---

## 1. État des lieux

### Natation — ce qui est déjà en place

| Élément                                                                                                  | Fichier                                                                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Slug `swimming`                                                                                          | `app/connectors/sport_slug.ts`                                                  |
| Mapping OW `swimming`, `pool_swimming` (→ `pool`) et `open_water_swimming` (→ `open_water`)              | `app/connectors/open_wearables/open_wearables_sport_mapper.ts`                  |
| Emoji 🏊 et couleur `#0891b2`                                                                            | `Onboarding/Wizard.tsx`, `components/analysis/shared.tsx`                       |
| Table `sports` générique                                                                                 | migration `1771104621148_create_sports_table.ts`                                |
| Agrégat de volume déjà ventilé par sport (`bucket.bySport`)                                              | `app/domain/services/analysis/aggregations.ts`                                  |
| Garde-fous « course uniquement » : VDOT, recalibrage, auto-link, rTSS, best efforts, GAP, découplage, EF | `session_load.ts`, `session_analysis.ts`, `aggregations.ts`, use cases planning |

### Natation — ce qui bloque

- Pas de ligne `swimming` dans la table `sports` : l'import OW renvoie `unsupported_sport:swimming`.
- `computeAllure` (`app/connectors/pace.ts`) donne des min/km pour tout ce qui n'est pas du vélo.
- Front : `useUnitConversion.formatSpeed` ne connaît que min/km et km/h, et des `/km` sont codés en dur dans `SessionForm`, `SessionInsights`, `SessionMap` et `SessionCurvesChart`.
- `RawOwWorkout` n'a **aucun champ natation** (longueurs, SWOLF, coups de bras, bassin). Seules les timeseries peuvent en fournir, ce qui reste à vérifier sur le serveur réel.

### GPX — ce qui existe

- Use case `EnrichSessionWithGpx`, route `POST /sessions/:id/enrich-gpx` et composant `EnrichGpxButton`.
- **Limite** : le bouton n'apparaît que si la séance n'a ni GPX, ni courbe, ni trace (`Show.tsx:174`). Une séance OW a presque toujours une courbe FC, donc le bouton est masqué.
- **Limite** : le use case **écrase** la durée, la distance et la courbe FC par celles du GPX. Pour une séance importée, les données de la montre sont souvent plus fiables (durée en mouvement, FC).

### Aide — ce qui existe

- Composant `InfoTooltip` (description et interprétation), mais utilisé seulement dans `FitnessMetrics`, `PaceZonesDisplay`, `MetricInsight` et `AthleteProfile`.
- Les pages Analyse (`FitnessSection`, `IntensitySection`, `EfficiencySection`, `RecoverySection`, `PerformanceSection`, `ReportSection`, `LoadCalendar`) affichent CTL, ATL, TSB, TRIMP, VDOT, LTHR, HRV, ACWR, monotonie / contrainte, découplage, EF, GAP, Z1–Z5, Karvonen… **sans explication**. Certaines descriptions de section existent, mais elles ne sont ni ciblées ni au survol.

---

## 2. Q3 — Totaux de distance : recommandation

Additionner des km de course et des km de nage n'a pas de sens : 2 km de nage représentent un effort comparable à 8 à 10 km de course. Proposition :

- **Durée, nombre de séances, charge (TSS/TRIMP)** restent des totaux globaux. Ils sont comparables entre sports, et c'est justement l'intérêt d'une charge normalisée.
- **Distance** : plus de total tous sports confondus. On affiche une ligne par sport (`🏃 42 km · 🏊 3 800 m`). La donnée existe déjà (`bySport`) ; seul l'affichage change.
- **Graphe de volume** (VolumeSection) : barres empilées par sport **en durée** par défaut, avec une bascule « distance » qui filtre sur un seul sport.

---

## 3. Phases

### A.1 — Débloquer l'import natation (backend)

| #    | Tâche                                                                                                                                 | Fichiers                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A1.1 | Migration de données idempotente qui insère `swimming` dans `sports`. Le seeder ne suffit pas en prod, car `db:seed` tronque la base. | `database/migrations/<ts>_seed_swimming_sport.ts`                                   |
| A1.2 | Seeder aligné.                                                                                                                        | `database/seeders/1_sport_seeder.ts`                                                |
| A1.3 | `SWIMMING_SLUGS` et une branche min/100 m dans `computeAllure`.                                                                       | `sport_slug.ts`, `pace.ts`                                                          |
| A1.4 | OW `#defaultName` lisible par sport et subType.                                                                                       | `open_wearables_connector.ts`                                                       |
| A1.5 | Constante `SWIMMING_SLUG` côté domaine (comme `RUNNING_SLUG`), sans import depuis `connectors/` (dependency-cruiser).                 | `app/domain/services/session_load.ts` ou un nouveau `domain/value_objects/sport.ts` |
| A1.6 | Tests : `pace.spec.ts`, mapper OW, connecteur OW (slug, subType, allure), import fonctionnel d'un `pool_swimming`.                    | `tests/unit/connectors/…`, `tests/functional/import/`                               |

### A.2 — Affichage et saisie

| #    | Tâche                                                                                                                                                                                 | Fichiers                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| A2.1 | Helpers `formatSwimPace` (`2'05/100m`) et `formatSwimDistance` (`1 500 m`), avec tests.                                                                                               | `inertia/lib/format.ts`, `format.test.ts` |
| A2.2 | `useUnitConversion` : `formatSpeed(pace, sportSlug?)` et `formatDistanceParts(km, sportSlug?)`.                                                                                       | `inertia/hooks/use_unit_conversion.ts`    |
| A2.3 | Brancher le slug dans `Sessions/Show`, `Sessions/Index`, `SessionCard`, `Dashboard`, `NextSessionWidget` et `EvolutionChart`. Vérifier que les controllers exposent bien `sportSlug`. | pages et composants                       |
| A2.4 | `SessionForm` : distance en mètres et aperçu d'allure en /100 m si le sport est la natation. Conversion m ↔ km côté front ; validator inchangé.                                       | `SessionForm.tsx`                         |
| A2.5 | Choix du subType (Piscine / Eau libre) en saisie manuelle, stocké dans `sportMetrics.subType` comme à l'import OW.                                                                    | `SessionForm.tsx`, validator sessions     |
| A2.6 | Masquer ce qui est sans objet : carte si piscine, splits/km, courbe d'allure, dynamique de course, bloc « même parcours ».                                                            | `Show.tsx`                                |
| A2.7 | i18n FR/EN (sport, subTypes, unités).                                                                                                                                                 | `resources/lang/{fr,en}`                  |

### A.3 — Métriques natation OW

| #    | Tâche                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3.1 | ✅ **Fait (doc publique open-wearables)** : timeseries `swimming_stroke_count` et `distance_swimming` ; ni longueurs, ni SWOLF, ni bassin. Mouvements importés ; longueurs déduites distance / bassin (saisi) ; SWOLF estimé. **Spike initial** : interroger le serveur OW sur un workout de nage réel et lister les types de timeseries disponibles (coups de bras, longueurs, SWOLF, bassin ?). Documenter le résultat dans `types.ts`. La suite de A.3 dépend de ce résultat. |
| A3.2 | `SwimMetrics` (`poolLengthM`, `laps`, `strokes`, `swolf`, `strokeType`) dans `domain/value_objects`, avec `SportMetrics = RunMetrics \| SwimMetrics \| …` et le garde `isSwimMetrics`.                                                                                                                                                                                                                                                                                           |
| A3.3 | `toSwimMetrics(samples)` dans `timeseries_converter`. `#fetchHeartRateCurve` demande ces types quand `sportSlug === 'swimming'`.                                                                                                                                                                                                                                                                                                                                                 |
| A3.4 | FC aquatique : si la couverture de la courbe est trop faible (seuil à définir, par exemple < 60 % de la durée), ignorer la courbe, ce qui fait retomber sur la FC moyenne puis le RPE.                                                                                                                                                                                                                                                                                           |
| A3.5 | Dédup OW : `swimming` et `pool_swimming` de deux sources pour une même séance doivent être reconnus comme identiques (comparer le **slug** mappé plutôt que le type brut).                                                                                                                                                                                                                                                                                                       |
| A3.6 | Section « Natation » dans `Show.tsx` : SWOLF, longueurs, coups de bras par longueur, allure par longueur si disponible.                                                                                                                                                                                                                                                                                                                                                          |

### A.4 — Analyses et stats

| #    | Tâche                                                                                                                                                                                                                | Fichiers                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A4.1 | Dashboard : distance par sport, et durée et charge globales (cf. §2).                                                                                                                                                | `Dashboard.tsx`, `get_dashboard*`                                  |
| A4.2 | VolumeSection : empilement par sport en durée, bascule distance mono-sport.                                                                                                                                          | `VolumeSection.tsx`, `aggregations.ts`                             |
| A4.3 | Filtre sport sur la page Analyse et sur la liste des séances (`SessionFilters` existe déjà : vérifier que la natation y apparaît).                                                                                   | `Analysis/Index.tsx`, `SessionFilters.tsx`                         |
| A4.4 | **Meilleurs efforts natation** : 100 / 200 / 400 / 1 500 m. Sans stream de distance, on se limite à la séance entière (meilleure allure moyenne sur une séance de distance ≥ X), ou aux longueurs si A3 les fournit. | `aggregations.ts`, `session_analysis.ts`, `PerformanceSection.tsx` |
| A4.5 | **Progression d'allure natation** : allure moyenne /100 m dans le temps (équivalent natation de l'EF course).                                                                                                        | `aggregations.ts`, `EfficiencySection.tsx`                         |
| A4.6 | IntensitySection (zones FC) : inclure la natation seulement si la courbe est jugée fiable (A3.4).                                                                                                                    | `aggregations.ts`                                                  |
| A4.7 | Rapport de période : volume et charge natation, record éventuel.                                                                                                                                                     | `report.ts`, `ReportSection.tsx`                                   |
| A4.8 | Carte des traces : la natation en eau libre y apparaît déjà si une trace existe. Vérifier la couleur et la légende.                                                                                                  | `TracksMap.tsx`                                                    |
| A4.9 | Export de données : vérifier que les colonnes natation (subType, métriques) sont incluses.                                                                                                                           | `export_user_data.ts`                                              |

### A.5 — CSS et sTSS

| #    | Tâche                                                                                                                                                              | Fichiers                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| A5.1 | `cssPacePer100m` sur `UserProfile` : migration, entité, repository.                                                                                                | `user_profiles`                                                           |
| A5.2 | Service de domaine `css_calculator` : CSS = (400 − 200) / (T400 − T200), et estimation automatique à partir des meilleurs efforts 200/400 m (A4.4).                | `app/domain/services/`                                                    |
| A5.3 | Formulaire profil : saisie directe de la CSS ou d'un test 400 m / 200 m.                                                                                           | `Profile/Edit.tsx`, validator                                             |
| A5.4 | sTSS = IF³ × heures × 100, avec IF = CSS / allure. Nouvelle `TrainingLoadMethod` `stss`, prioritaire pour la natation quand la CSS est connue, avant TRIMP et RPE. | `training_load_calculator_impl.ts`, `session_load.ts`, `training_load.ts` |
| A5.5 | Recalcul : `sessions:recompute` et recalcul automatique quand la CSS change (même mécanisme que pour les zones FC).                                                | commande + use case profil                                                |
| A5.6 | Tests unitaires du calcul et du choix de méthode.                                                                                                                  | `tests/unit/services/…`                                                   |

### B — Ajouter un GPX à une séance importée

| #   | Tâche                                                                                                                                                                                                                                                                                                                     | Fichiers                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| B.1 | Afficher `EnrichGpxButton` dès qu'il n'y a **pas de trace GPS** (au lieu de « ni courbe ni trace »). S'il y a déjà un GPX, proposer « Remplacer le GPX ».                                                                                                                                                                 | `Show.tsx`, `EnrichGpxButton.tsx`              |
| B.2 | **Règle de fusion** pour une séance importée : le GPX apporte la trace, l'altitude, les splits et la courbe d'allure. La durée, la distance, la FC moyenne et la courbe FC venant de la montre sont conservées, sauf si elles sont absentes. Pour une séance manuelle, on garde le comportement actuel (le GPX fait foi). | `enrich_session_with_gpx.ts`, `gpx_metrics.ts` |
| B.3 | Contrôle de cohérence : avertir si la date ou l'heure du GPX s'écarte de la séance (par exemple > 1 h ou un autre jour). Erreur métier traduite, sans rejet silencieux.                                                                                                                                                   | use case + nouvelle erreur domaine             |
| B.4 | Recalcul des dérivés (analyse, `trackPreview`, « même parcours ») : déjà fait par `deriveSessionFields`. Vérifier que les séances de natation ne déclenchent pas les analyses course.                                                                                                                                     | —                                              |
| B.5 | Tests fonctionnels : GPX sur une séance OW avec courbe FC (courbe conservée, trace ajoutée), remplacement d'un GPX, GPX d'un autre jour.                                                                                                                                                                                  | `tests/functional/sessions/`                   |

### C — Aide sur les notions et acronymes

| #   | Tâche                                                                                                                                                                                                                                                                                                                                                                                                                       | Fichiers                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| C.1 | **Glossaire centralisé** : un fichier i18n `glossary.json` (FR/EN) avec, pour chaque terme, un nom complet, une définition courte, comment le lire (valeurs repères) et, facultativement, un lien. Termes : CTL, ATL, TSB, TSS, rTSS, sTSS, TRIMP, VDOT, FCmax, FC repos, LTHR, Karvonen, Z1–Z5, HRV/VFC, SpO2, VO2max, ACWR, monotonie, contrainte, découplage, dérive cardiaque, EF, GAP, RPE, CSS, SWOLF, allure /100 m. | `resources/lang/{fr,en}/glossary.json`                    |
| C.2 | Composant `<Term id="ctl">CTL</Term>` : texte souligné en pointillé avec un `InfoTooltip` alimenté par le glossaire. Accessible au clavier et utilisable au toucher (pas seulement au survol).                                                                                                                                                                                                                              | `inertia/components/shared/Term.tsx`                      |
| C.3 | Poser `<Term>` sur tous les libellés concernés : sections Analyse, `FitnessMetrics`, `TrimpIndicator`, `CardiacDriftIndicator`, `HeartRateZonesChart`, `SessionInsights`, profil (zones, méthode FC), planning (VDOT, allures).                                                                                                                                                                                             | composants listés                                         |
| C.4 | **Page « Comprendre mes métriques »** (`/help/metrics`) qui liste tout le glossaire, avec des ancres. Chaque tooltip renvoie vers « En savoir plus ».                                                                                                                                                                                                                                                                       | `inertia/pages/Help/Metrics.tsx`, route, controller mince |
| C.5 | Test i18n : chaque `Term id` utilisé existe en FR et en EN (il y a déjà des tests dans `tests/unit/i18n`).                                                                                                                                                                                                                                                                                                                  | `tests/unit/i18n/`                                        |

---

## 4. Ordre de réalisation

1. **A.1 → A.2** : la natation est importable et lisible.
2. **C.1 → C.2** : le glossaire et `<Term>`, pour que A.4 et A.5 les utilisent dès l'écriture (SWOLF, CSS, sTSS).
3. **A.3** : le spike OW conditionne A4.4 et A4.6.
4. **A.4 → A.5**.
5. **B** : indépendant, peut s'intercaler n'importe où.
6. **C.3 → C.5** : on pose `<Term>` sur l'existant, puis on crée la page d'aide.

Une PR unique sur `feat/natation` avec un commit par sous-phase (A.1, A.2, …), pour une relecture incrémentale.

## 5. Points d'attention

- **Dependency-cruiser** : le domaine ne doit rien importer de `connectors/`. Les slugs utiles au domaine sont dupliqués en constantes domaine (comme `RUNNING_SLUG` aujourd'hui).
- **Relance d'import** : les `import_sessions` déjà en échec `unsupported_sport:swimming` ont atteint le plafond de 3 essais. Prévoir, dans la migration A1.1 ou dans une commande, la remise à zéro de ces échecs précis pour qu'ils soient réimportés.
- **Refactor `isRunning`** : avec la natation, `isRunning` + `RUNNING` + `SWIMMING` commencent à se multiplier. Si A.4 et A.5 ajoutent trop de `if (sport === …)`, extraire un `SportProfile` dans le domaine : unité d'allure, analyses disponibles, méthode de charge.
- **Fiabilité FC en natation** : c'est le principal risque qualité sur la charge et les zones. D'où A3.4, et l'intérêt du sTSS (A.5).
