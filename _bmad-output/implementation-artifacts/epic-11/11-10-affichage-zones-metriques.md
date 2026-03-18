# Story 11.10 : Affichage zones FC et metriques calculees dans le detail

Status: done

## Story

As a **utilisateur connecte**,
I want **voir les zones FC, le drift cardiaque et le TRIMP dans le detail de ma seance**,
so that **j'evalue la qualite de mon entrainement d'un coup d'oeil**.

## Acceptance Criteria

1. **Given** je consulte le detail d'une seance avec des zones FC calculees **When** la section "Analyse" s'affiche **Then** je vois : un bar chart horizontal des zones FC (Z1 a Z5) avec le % de temps et la couleur par zone, le drift cardiaque en % avec indicateur visuel (neutre si < 5%, orange si > 5%), le TRIMP avec echelle qualitative (leger / modere / dur / tres dur), l'allure moyenne par km (tableau des splits)
2. **Given** la seance a des splits **When** le tableau des splits s'affiche **Then** chaque ligne montre : km, allure, FC moy, denivele du split **And** le split le plus rapide est mis en evidence
3. **Given** la seance n'a pas de FC max configuree dans le profil **When** le detail s'affiche **Then** les zones FC ne sont pas affichees **And** un message discret invite a "Configurer la FC max dans le profil pour voir les zones"

## Tasks / Subtasks

- [x] Task 1 : Composant — bar chart zones FC (AC: #1)
  - [x] Creer `inertia/components/sessions/HeartRateZonesChart.tsx`
  - [x] Bar chart horizontal Recharts avec 5 barres (Z1 a Z5)
  - [x] Chaque barre : couleur de zone, label (Z1-Z5), % du temps, duree en minutes
  - [x] Couleurs : Z1 gris, Z2 bleu, Z3 vert, Z4 orange, Z5 rouge
- [x] Task 2 : Composant — drift cardiaque (AC: #1)
  - [x] Creer `inertia/components/sessions/CardiacDriftIndicator.tsx`
  - [x] Affichage : valeur en %, icone et couleur selon seuil
  - [x] < 5% : gris/neutre "Normal"
  - [x] 5-10% : orange "Fatigue moderee"
  - [x] > 10% : orange fonce "Fatigue significative"
- [x] Task 3 : Composant — TRIMP (AC: #1)
  - [x] Creer `inertia/components/sessions/TrimpIndicator.tsx`
  - [x] Affichage : valeur numerique + echelle qualitative
  - [x] < 50 : "Leger" | 50-100 : "Modere" | 100-200 : "Dur" | > 200 : "Tres dur"
- [x] Task 4 : Composant — tableau des splits (AC: #2)
  - [x] Creer `inertia/components/sessions/SplitsTable.tsx`
  - [x] Colonnes : km, allure (formatee selon pref), FC moy (si dispo), denivele
  - [x] Ligne du split le plus rapide mise en evidence (background accent)
  - [x] Allure formatee selon la preference utilisateur
- [x] Task 5 : Section "Analyse" dans la page detail (AC: #1, #3)
  - [x] Ajouter la section sous les metriques de base et au-dessus des courbes
  - [x] Condition d'affichage : au moins `hrZones` ou `splits` present dans `sportMetrics`
  - [x] Si pas de FC max configuree : afficher message d'invitation avec lien vers le profil
- [x] Task 6 : Responsive mobile (AC: #1, #2)
  - [x] Bar chart zones : empile verticalement sur mobile
  - [x] Tableau splits : scroll horizontal sur mobile si necessaire

## Dev Notes

### Echelle TRIMP

| Plage | Qualification | Contexte |
|-------|--------------|---------|
| < 50 | Leger | Footing de recuperation |
| 50-100 | Modere | Sortie endurance standard |
| 100-200 | Dur | Seance seuil / fractionne |
| > 200 | Tres dur | Sortie longue intense / competition |

### Couleurs zones FC

Utiliser les couleurs du design system Sporty (palette sobre). Eviter le rouge vif pour Z5 — utiliser un rouge/orange doux coherent avec la directive "pas de rouge pour les echecs".

### Split le plus rapide

Identifier le split avec la valeur `paceSeconds` la plus basse. Le mettre en evidence avec un background `accent/10` et une icone eclair ou etoile.

### Dependances

- Story 11.7 (calcul zones FC, drift, TRIMP dans sportMetrics)
- Story 11.8 (composants courbes deja integres dans la page detail)

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.10]

## Dev Agent Record

### Completion Notes

Implémentation complète via commit 12e823f (2026-03-18).

- `HeartRateZonesChart.tsx` (64 lignes) : bar chart horizontal Recharts, 5 zones (Z1 gris, Z2 bleu, Z3 vert, Z4 orange, Z5 rouge), % du temps + durée en minutes
- `CardiacDriftIndicator.tsx` (33 lignes) : seuils normal (< 5%) / fatigue modérée (5–10%) / significative (> 10%), i18n FR/EN
- `TrimpIndicator.tsx` (33 lignes) : échelle léger / modéré / dur / très dur, i18n FR/EN
- `SplitsTable.tsx` (74 lignes) : colonnes km/allure/FC moy/dénivelé, split le plus rapide mis en évidence avec icône ⚡
- Section "Analyse" intégrée dans `Show.tsx` entre métriques de base et courbes ; message d'invitation profil si FC max absente
- Axe Y FC curve en domain auto pour mieux coller aux valeurs
- Traductions FR/EN complètes pour tous les composants

### File List

- `inertia/components/sessions/HeartRateZonesChart.tsx` (nouveau)
- `inertia/components/sessions/CardiacDriftIndicator.tsx` (nouveau)
- `inertia/components/sessions/TrimpIndicator.tsx` (nouveau)
- `inertia/components/sessions/SplitsTable.tsx` (nouveau)
- `inertia/components/sessions/SessionCurvesChart.tsx` (modifié)
- `inertia/pages/Sessions/Show.tsx` (modifié)
- `resources/lang/fr/sessions.json` (modifié)
- `resources/lang/en/sessions.json` (modifié)

### Change Log

- 2026-03-18 : Implémentation complète Story 11.10 — Section Analyse (zones FC, drift, TRIMP, splits)
