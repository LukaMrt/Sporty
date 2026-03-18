# Story 11.8 : Visualisation courbes FC/allure dans le detail seance

Status: done

## Story

As a **utilisateur connecte**,
I want **voir les courbes de frequence cardiaque et d'allure sur la duree de ma seance**,
so that **je comprends comment mon effort a evolue pendant la sortie**.

## Acceptance Criteria

1. **Given** je consulte le detail d'une seance avec des courbes (import GPX) **When** la page se charge **Then** un graphique Recharts affiche : courbe FC(t) en rouge/orange (axe Y gauche, bpm), courbe allure(t) en bleu (axe Y droit, min/km ou km/h selon preference), axe X = temps ecoule **And** les deux courbes sont superposees
2. **Given** je survole (desktop) ou tape (mobile) un point du graphique **When** le tooltip s'affiche **Then** il montre : temps ecoule, FC (bpm), allure, altitude, km courant
3. **Given** la seance a aussi une courbe d'altitude **When** le graphique s'affiche **Then** l'altitude est representee en area chart grise en arriere-plan (profil du parcours)
4. **Given** la seance n'a pas de courbe FC (pas de montre cardio) **When** le graphique s'affiche **Then** seule la courbe d'allure est affichee (pas d'erreur)
5. **Given** la seance n'a aucune courbe (saisie manuelle simple) **When** je consulte le detail **Then** la section graphique n'est pas affichee

## Tasks / Subtasks

- [x] Task 1 : Composant React — graphique courbes (AC: #1, #3)
  - [x] Creer `inertia/components/sessions/SessionCurvesChart.tsx`
  - [x] Recharts `ComposedChart` avec `Line` (FC), `Line` (allure), `Area` (altitude en fond)
  - [x] Double axe Y : gauche pour FC (bpm), droit pour allure (min/km ou km/h)
  - [x] Axe X en temps ecoule (mm:ss ou hh:mm:ss)
  - [x] Couleurs : FC rouge/orange, allure bleu, altitude gris clair
- [x] Task 2 : Tooltip personnalise (AC: #2)
  - [x] Custom tooltip Recharts affichant temps, FC, allure, altitude, km
  - [x] Allure formatee selon la preference utilisateur (min/km ou km/h)
  - [x] Responsive : fonctionne au tap sur mobile (ResponsiveContainer + Tooltip natif Recharts)
- [x] Task 3 : Gestion des donnees partielles (AC: #4, #5)
  - [x] Si pas de `heartRateCurve` : masquer la ligne FC + axe Y gauche
  - [x] Si pas de `altitudeCurve` : masquer l'area chart de fond
  - [x] Si aucune courbe dans `sportMetrics` : ne pas rendre le composant
- [x] Task 4 : Integration dans la page detail seance (AC: #1)
  - [x] Ajouter `SessionCurvesChart` dans la page detail, sous les metriques de base
  - [x] Passer les props : `heartRateCurve`, `paceCurve`, `altitudeCurve`, `speedUnit`

## Dev Notes

### Structure des donnees attendues

Les courbes viennent de `sportMetrics` (type `RunMetrics`) :
- `heartRateCurve: DataPoint[]` — `{ time: number (seconds), value: number (bpm) }`
- `paceCurve: DataPoint[]` — `{ time: number (seconds), value: number (s/km) }`
- `altitudeCurve: DataPoint[]` — `{ time: number (seconds), value: number (metres) }`

### Conversion allure

- Si preference `min_km` : convertir `value` (s/km) en "M:SS" pour l'affichage
- Si preference `km_h` : convertir `value` (s/km) en km/h = 3600 / value

### Performance

Avec un sampling de 15s, une seance d'1h = ~240 points par courbe. Recharts gere ca sans probleme. Une seance de 3h = ~720 points, toujours fluide.

### Dependances

- Story 11.6 (les courbes existent dans sportMetrics apres import GPX)
- Recharts (deja installe dans le projet)

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.8]
- Recharts ComposedChart : https://recharts.org/en-US/api/ComposedChart

## Dev Agent Record

### Implementation Plan

1. Creer `SessionCurvesChart.tsx` avec Recharts ComposedChart (Line FC, Line allure, Area altitude)
2. Merger les DataPoint[] des 3 courbes par timestamp commun
3. Calculer le km courant incrementalement dans le merge
4. Custom tooltip avec formatage allure selon speedUnit
5. Integrer dans Show.tsx en extrayant les courbes de sportMetrics (spread pour garder les scalaires separes)
6. Ajouter cle i18n `sessions.show.curves` en fr et en

### Completion Notes

- `SessionCurvesChart` gere les 3 scenarios : FC + allure + altitude, allure seule, FC seule
- L'axe allure est inverse en mode min/km (plus petit = plus vite = en haut)
- `isAnimationActive={false}` pour performance sur 700+ points
- Le merge des courbes calcule aussi le km courant approximatif via la vitesse instantanee
- `scalarMetrics` extrait les courbes de `sportMetrics` pour eviter de les afficher dans la section "metriques specifiques"
- `MetricInsight` : tooltip au survol (hover) au lieu du clic ; labels et descriptions via i18n (`useTranslation`)
- `CreateSession` : calculs zones Karvonen + drift + TRIMP depuis la courbe FC quand un GPX est importe a la creation (parité avec `EnrichSessionWithGpx`)
- Factorisation : `buildScalarRunMetrics` et `buildMonoZoneHrMetrics` extraits dans `heart_rate_zone_service` pour supprimer la duplication Create/Update

### File List

- `inertia/components/sessions/SessionCurvesChart.tsx` (created)
- `inertia/components/sessions/MetricInsight.tsx` (created)
- `inertia/pages/Sessions/Show.tsx` (modified)
- `resources/lang/fr/sessions.json` (modified)
- `resources/lang/en/sessions.json` (modified)
- `app/use_cases/sessions/create_session.ts` (modified)
- `app/use_cases/sessions/update_session.ts` (modified)
- `app/domain/services/heart_rate_zone_service.ts` (modified)

### Change Log

- 2026-03-18 : Story 11.8 implementee — composant SessionCurvesChart avec Recharts ComposedChart, integration dans Show.tsx, i18n fr/en
- 2026-03-18 : MetricInsight i18n + hover, CreateSession parité GPX, factorisation buildScalarRunMetrics/buildMonoZoneHrMetrics
