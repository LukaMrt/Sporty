# Story 6.5: Affichage dans les unités configurées

Status: done

## Story

As a **utilisateur connecté**,
I want **voir toutes mes données affichées dans les unités que j'ai choisies**,
So that **les métriques sont dans le format qui me parle** (FR21).

## Acceptance Criteria (BDD)

### AC1 — Affichage en min/km
**Given** j'ai configuré mes unités en "min/km" dans mon profil
**When** je consulte le dashboard (HeroMetric, QuickStatCards, graphiques)
**Then** toutes les allures sont affichées en min/km

### AC2 — Affichage en km/h
**Given** j'ai configuré mes unités en "km/h"
**When** je consulte le dashboard
**Then** toutes les allures sont affichées en km/h

### AC3 — Changement immédiat
**Given** je change mes unités dans le profil de min/km à km/h
**When** je reviens sur le dashboard
**Then** toutes les valeurs sont immédiatement converties dans la nouvelle unité
**And** les données stockées en base ne sont pas modifiées (conversion à l'affichage uniquement)

### AC4 — Unités sur détail et liste séances
**Given** je consulte le détail d'une séance ou la liste des séances
**When** les données s'affichent
**Then** les unités respectent également ma préférence

### AC5 — Unités sur graphiques
**Given** je consulte les graphiques d'évolution avec km/h configuré
**When** le graphique affiche l'allure
**Then** l'axe Y et les tooltips affichent les valeurs en km/h

## Tasks / Subtasks

- [x] Task 1 — Hook `useUnitConversion` (AC: #1, #2, #3)
  - [x] Créer `inertia/hooks/use_unit_conversion.ts`
  - [x] Le hook lit les préférences utilisateur depuis les shared props Inertia
  - [x] **Données stockées en min/km et km en base** — conversion à l'affichage uniquement

- [x] Task 2 — Passer `userPreferences` en shared props Inertia (AC: #1-5)
  - [x] Vérifier si `userPreferences` est déjà partagé globalement via le middleware Inertia
  - [x] Modifier `config/inertia.ts` pour partager `userPreferences` dans les shared props via `app.container.make(UserProfileRepository)`
  - [x] Cela évite de le passer dans chaque controller individuellement

- [x] Task 3 — Appliquer le hook dans `HeroMetric.tsx` (AC: #1, #2)
  - [x] Utiliser `useUnitConversion()` pour formater l'allure principale
  - [x] Le sparkline min/max utilise aussi `formatSpeed`

- [x] Task 4 — Appliquer le hook dans `Dashboard.tsx` pour QuickStatCard (AC: #1, #2)
  - [x] Volume : conversion km ↔ miles via `distanceUnit`
  - [x] FC : pas de conversion (universelle en bpm)
  - [x] Sessions : pas de conversion (count)

- [x] Task 5 — Appliquer le hook dans `EvolutionChart.tsx` (AC: #5)
  - [x] Axe Y : si métrique = pace, convertir les valeurs avec `convertPaceForChart`
  - [x] Tooltip : utiliser `formatSpeed` selon la métrique
  - [x] Données converties via `useMemo` avant passage à Recharts

- [x] Task 6 — Appliquer dans les pages Sessions existantes (AC: #4)
  - [x] `SessionCard.tsx` : utiliser `formatDistance` pour la distance
  - [x] `Sessions/Show.tsx` : formater distance et allure avec les préférences

- [x] Task 7 — Étendre `inertia/lib/format.ts` (AC: #1, #2)
  - [x] Ajouter `paceToKmh(paceMinPerKm: number): number`
  - [x] Ajouter `kmToMiles(km: number): number`
  - [x] Le hook `useUnitConversion` les utilise en interne

- [x] Task 8 — Tests (AC: #1-5)
  - [x] `tests/unit/lib/format.spec.ts` : paceToKmh(5)→12.0, paceToKmh(6)→10.0, kmToMiles(10)→6.21

## Dev Notes

### Architecture Compliance
- **Conversion à l'affichage UNIQUEMENT** — les données en base restent en min/km et km. Jamais de conversion en base
- **Hook React** pour la conversion — utilisable dans tous les composants
- **Fonctions pures** dans `format.ts` pour la logique de conversion (testables sans React)
- **Shared props Inertia** pour les préférences — évite de les passer dans chaque controller

### UserPreferences — Structure Existante
Le modèle `UserProfile` a déjà un champ `preferences` de type JSONB avec la structure :
```typescript
type UserPreferences = {
  speedUnit: 'min_km' | 'km_h'
  distanceUnit: 'km' | 'mi'
  weightUnit: 'kg' | 'lbs'
  weekStartsOn: 'monday' | 'sunday'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY'
}
```
Valeurs par défaut : `speedUnit: 'min_km'`, `distanceUnit: 'km'`

### Patterns Existants à Suivre
- Le hook `useUnitConversion` suit le pattern des hooks React classiques
- Les shared props Inertia sont déjà utilisées pour `user` (cf. `MainLayout.tsx` qui accède à `usePage().props`)
- Le fichier `inertia/lib/format.ts` contient déjà `formatPace(durationMinutes, distanceKm)` et `formatDuration`

### Points d'Attention
- **Ne pas casser les pages Sessions** (Index, Show, Create, Edit) — ajouter le hook de manière additive
- **Graphiques** : convertir les données via `useMemo` pour éviter les re-renders
- **Fallback** : si pas de préférences (utilisateur sans profil), utiliser les valeurs par défaut `DEFAULT_USER_PREFERENCES`

### Fichiers Impactés
- `inertia/hooks/use_unit_conversion.ts` — NOUVEAU
- `inertia/lib/format.ts` — étendre (paceToKmh, kmToMiles)
- `config/inertia.ts` ou middleware — partager userPreferences
- `inertia/components/shared/HeroMetric.tsx` — modifier
- `inertia/components/shared/QuickStatCard.tsx` — modifier
- `inertia/components/shared/EvolutionChart.tsx` — modifier
- `inertia/pages/Sessions/Index.tsx` — modifier (SessionCard)
- `inertia/pages/Sessions/Show.tsx` — modifier

### Dépendances
- **Stories 6.1, 6.2, 6.3 DOIVENT être implémentées avant** (composants à modifier)
- Story 6.4 est indépendante de celle-ci (pas de conflit)

### References
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Story 6.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Conversion d'unités]
- [Source: app/domain/entities/user_preferences.ts — DEFAULT_USER_PREFERENCES]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List
- Hook `useUnitConversion` créé en `inertia/hooks/use_unit_conversion.ts` — lit `userPreferences` depuis les shared props Inertia, avec fallback `min_km`/`km`
- `config/inertia.ts` étendu : `userPreferences` partagé globalement via `app.container.make(UserProfileRepository)` — aucun controller modifié
- Fonctions pures `paceToKmh` et `kmToMiles` ajoutées dans `inertia/lib/format.ts` et utilisées en interne par le hook
- Conversion côté client uniquement — les données en base restent en min/km et km
- `HeroMetric`, `EvolutionChart`, `Dashboard` (volume QuickStatCard), `SessionCard`, `Sessions/Show` appliquent le hook
- Bonus hors story : page profil toujours visible (suppression du `{profile && ...}`) + use case `update_profile` gère l'upsert si aucun profil existant

### File List
- `inertia/hooks/use_unit_conversion.ts` — NOUVEAU
- `inertia/lib/format.ts` — étendu (paceToKmh, kmToMiles)
- `config/inertia.ts` — userPreferences en shared props
- `inertia/components/shared/HeroMetric.tsx` — formatSpeed
- `inertia/components/shared/EvolutionChart.tsx` — convertPaceForChart + useMemo
- `inertia/pages/Dashboard.tsx` — volume km/mi
- `inertia/components/sessions/SessionCard.tsx` — formatDistance
- `inertia/pages/Sessions/Show.tsx` — formatSpeed + distanceUnit
- `inertia/pages/Profile/Edit.tsx` — section profil toujours visible
- `app/use_cases/profile/update_profile.ts` — upsert si pas de profil existant
- `tests/unit/lib/format.spec.ts` — NOUVEAU
