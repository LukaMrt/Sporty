# Story 11.9 : Carte GPS du parcours

Status: done

## Story

As a **utilisateur connecte**,
I want **voir la carte de mon parcours de course**,
so that **je visualise le trace de ma sortie**.

## Acceptance Criteria

1. **Given** je consulte le detail d'une seance avec des donnees GPS (import GPX) **When** la page se charge **Then** une carte Leaflet affiche le trace du parcours en polyline coloree **And** la carte est auto-zoomee pour afficher tout le parcours **And** un marqueur indique le depart (vert) et l'arrivee (rouge)
2. **Given** le parcours a des donnees d'altitude **When** la carte s'affiche **Then** la polyline est coloree par gradient selon l'altitude (ou optionnellement par allure ou FC)
3. **Given** je clique sur un point du trace **When** un popup s'affiche **Then** il montre : km, allure, FC, altitude a ce point
4. **Given** la seance n'a pas de donnees GPS **When** je consulte le detail **Then** la carte n'est pas affichee

## Tasks / Subtasks

- [x] Task 1 : Installer Leaflet (AC: #1)
  - [x] `pnpm add leaflet react-leaflet`
  - [x] `pnpm add -D @types/leaflet`
  - [x] Configurer le CSS Leaflet (import dans le layout ou lazy)
- [x] Task 2 : Composant React — carte parcours (AC: #1, #4)
  - [x] Creer `inertia/components/sessions/SessionMap.tsx`
  - [x] `MapContainer` avec `TileLayer` OpenStreetMap
  - [x] `Polyline` avec les coordonnees `gpsTrack`
  - [x] Auto-zoom via `fitBounds` sur l'ensemble des points
  - [x] Marqueur depart (icone vert) et arrivee (icone rouge)
  - [x] Ne rendre le composant que si `gpsTrack` existe et a > 1 point
- [x] Task 3 : Polyline coloree par gradient (AC: #2)
  - [x] Decouper la polyline en segments
  - [x] Colorer chaque segment selon l'altitude (gradient bleu bas → rouge haut)
  - [x] Option : toggle pour colorer par allure ou FC (boutons au-dessus de la carte)
- [x] Task 4 : Popup interactif (AC: #3)
  - [x] Au clic sur un point du trace, afficher un popup Leaflet
  - [x] Contenu : km (distance cumulee), allure, FC (si dispo), altitude
  - [x] Trouver le point le plus proche du clic dans `gpsTrack`
- [x] Task 5 : Lazy loading (AC: #1)
  - [x] Charger Leaflet en lazy import (`React.lazy` + `Suspense`)
  - [x] Ne pas inclure Leaflet dans le bundle principal
  - [x] Fallback de chargement : placeholder avec spinner
- [x] Task 6 : Integration dans la page detail seance (AC: #1, #4)
  - [x] Ajouter `SessionMap` dans la page detail, au-dessus des courbes
  - [x] Passer les props : `gpsTrack`, `heartRateCurve`, `paceCurve`, `altitudeCurve`

## Dev Notes

### Tuiles OpenStreetMap

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

Gratuit, pas de cle API. Attribution requise : "© OpenStreetMap contributors". Coherent avec l'approche self-hosted.

### Lazy loading Leaflet

Leaflet + react-leaflet pesent ~40 Ko gzipped. Les charger uniquement sur la page de detail de seance quand des donnees GPS existent. Utiliser `React.lazy` :

```tsx
const SessionMap = React.lazy(() => import('./SessionMap'))
```

### Polyline par gradient

Leaflet ne supporte pas nativement les gradients sur polyline. Deux approches :
1. **Segments multiples** : decouper la polyline en N segments, chaque segment avec sa couleur → simple mais beaucoup d'elements DOM
2. **Plugin `leaflet-hotline`** : supporte les gradients natifs → plus performant

Recommandation : commencer par les segments multiples (plus simple), migrer vers `leaflet-hotline` si performance problematique.

### Structure GpsPoint

```typescript
interface GpsPoint {
  lat: number
  lon: number
  ele?: number
  time: number // seconds depuis le debut
}
```

### Dependances

- Story 11.6 (donnees `gpsTrack` dans sportMetrics apres import GPX)

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.9]
- react-leaflet : https://react-leaflet.js.org/
- OpenStreetMap : https://www.openstreetmap.org/

## Dev Agent Record

### Completion Notes

Implémentation complète via commit a0beed8 (2026-03-18).

- `SessionMap.tsx` (252 lignes) : MapContainer OpenStreetMap, polyline multi-segments colorée par allure ou FC (gradient bleu→rouge), marqueurs départ (vert) / arrivée (rouge), popup interactif au clic (km, allure, FC, altitude), toggle allure/FC/altitude au-dessus de la carte
- Lazy-load via `React.lazy` + `Suspense` — Leaflet hors bundle principal
- Intégration dans `Show.tsx` (au-dessus des courbes) et `SessionForm` (aperçu immédiat après import GPX)
- Légendes des courbes traduites dans `SessionCurvesChart`
- Clés i18n ajoutées : `map`, `mapColorPace`, `mapColorHr`, `curveLegendHr`, `curveLegendPace`, `curveLegendAltitude` (FR + EN)

### File List

- `inertia/components/sessions/SessionMap.tsx` (nouveau)
- `inertia/components/sessions/SessionCurvesChart.tsx` (modifié)
- `inertia/components/sessions/SessionForm.tsx` (modifié)
- `inertia/pages/Sessions/Show.tsx` (modifié)
- `package.json` (modifié — ajout leaflet, react-leaflet, @types/leaflet)
- `pnpm-lock.yaml` (modifié)
- `resources/lang/fr/sessions.json` (modifié)
- `resources/lang/en/sessions.json` (modifié)

### Change Log

- 2026-03-18 : Implémentation complète Story 11.9 — Carte GPS Leaflet
