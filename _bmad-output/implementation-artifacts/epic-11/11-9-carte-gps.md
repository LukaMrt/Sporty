# Story 11.9 : Carte GPS du parcours

Status: pending

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

- [ ] Task 1 : Installer Leaflet (AC: #1)
  - [ ] `pnpm add leaflet react-leaflet`
  - [ ] `pnpm add -D @types/leaflet`
  - [ ] Configurer le CSS Leaflet (import dans le layout ou lazy)
- [ ] Task 2 : Composant React — carte parcours (AC: #1, #4)
  - [ ] Creer `inertia/components/sessions/SessionMap.tsx`
  - [ ] `MapContainer` avec `TileLayer` OpenStreetMap
  - [ ] `Polyline` avec les coordonnees `gpsTrack`
  - [ ] Auto-zoom via `fitBounds` sur l'ensemble des points
  - [ ] Marqueur depart (icone vert) et arrivee (icone rouge)
  - [ ] Ne rendre le composant que si `gpsTrack` existe et a > 1 point
- [ ] Task 3 : Polyline coloree par gradient (AC: #2)
  - [ ] Decouper la polyline en segments
  - [ ] Colorer chaque segment selon l'altitude (gradient bleu bas → rouge haut)
  - [ ] Option : toggle pour colorer par allure ou FC (boutons au-dessus de la carte)
- [ ] Task 4 : Popup interactif (AC: #3)
  - [ ] Au clic sur un point du trace, afficher un popup Leaflet
  - [ ] Contenu : km (distance cumulee), allure, FC (si dispo), altitude
  - [ ] Trouver le point le plus proche du clic dans `gpsTrack`
- [ ] Task 5 : Lazy loading (AC: #1)
  - [ ] Charger Leaflet en lazy import (`React.lazy` + `Suspense`)
  - [ ] Ne pas inclure Leaflet dans le bundle principal
  - [ ] Fallback de chargement : placeholder avec spinner
- [ ] Task 6 : Integration dans la page detail seance (AC: #1, #4)
  - [ ] Ajouter `SessionMap` dans la page detail, au-dessus des courbes
  - [ ] Passer les props : `gpsTrack`, `heartRateCurve`, `paceCurve`, `altitudeCurve`

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
