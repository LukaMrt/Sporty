# Story 11.8 : Visualisation courbes FC/allure dans le detail seance

Status: pending

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

- [ ] Task 1 : Composant React — graphique courbes (AC: #1, #3)
  - [ ] Creer `inertia/components/sessions/SessionCurvesChart.tsx`
  - [ ] Recharts `ComposedChart` avec `Line` (FC), `Line` (allure), `Area` (altitude en fond)
  - [ ] Double axe Y : gauche pour FC (bpm), droit pour allure (min/km ou km/h)
  - [ ] Axe X en temps ecoule (mm:ss ou hh:mm:ss)
  - [ ] Couleurs : FC rouge/orange, allure bleu, altitude gris clair
- [ ] Task 2 : Tooltip personnalise (AC: #2)
  - [ ] Custom tooltip Recharts affichant temps, FC, allure, altitude, km
  - [ ] Allure formatee selon la preference utilisateur (min/km ou km/h)
  - [ ] Responsive : fonctionne au tap sur mobile
- [ ] Task 3 : Gestion des donnees partielles (AC: #4, #5)
  - [ ] Si pas de `heartRateCurve` : masquer la ligne FC + axe Y gauche
  - [ ] Si pas de `altitudeCurve` : masquer l'area chart de fond
  - [ ] Si aucune courbe dans `sportMetrics` : ne pas rendre le composant
- [ ] Task 4 : Integration dans la page detail seance (AC: #1)
  - [ ] Ajouter `SessionCurvesChart` dans la page detail, sous les metriques de base
  - [ ] Passer les props : `heartRateCurve`, `paceCurve`, `altitudeCurve`, `speedUnit`

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
