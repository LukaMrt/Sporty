# Story 6.5: Affichage dans les unités configurées

Status: ready-for-dev

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

- [ ] Task 1 — Hook `useUnitConversion` (AC: #1, #2, #3)
  - [ ] Créer `inertia/hooks/use_unit_conversion.ts`
  - [ ] Le hook lit les préférences utilisateur depuis les shared props Inertia :
    ```typescript
    export function useUnitConversion() {
      const { userPreferences } = usePage<SharedProps>().props
      const speedUnit = userPreferences?.speedUnit ?? 'min_km'
      const distanceUnit = userPreferences?.distanceUnit ?? 'km'

      const formatSpeed = (paceMinPerKm: number): string => {
        if (speedUnit === 'km_h') {
          const kmh = 60 / paceMinPerKm
          return `${kmh.toFixed(1)} km/h`
        }
        return formatPaceMinSec(paceMinPerKm)  // "5'12/km"
      }

      const formatDistance = (km: number): string => {
        if (distanceUnit === 'mi') {
          return `${(km * 0.621371).toFixed(1)} mi`
        }
        return `${km.toFixed(1)} km`
      }

      const convertPaceForChart = (paceMinPerKm: number): number => {
        if (speedUnit === 'km_h') return 60 / paceMinPerKm
        return paceMinPerKm
      }

      return { formatSpeed, formatDistance, convertPaceForChart, speedUnit, distanceUnit }
    }
    ```
  - [ ] **Données stockées en min/km et km en base** — conversion à l'affichage uniquement

- [ ] Task 2 — Passer `userPreferences` en shared props Inertia (AC: #1-5)
  - [ ] Vérifier si `userPreferences` est déjà partagé globalement via le middleware Inertia
  - [ ] Si non : modifier `config/inertia.ts` ou le middleware pour partager `userPreferences` dans les shared props :
    ```typescript
    // Dans le HandleInertiaRequests middleware ou config
    sharedData: {
      user: (ctx) => ctx.auth.user,
      userPreferences: async (ctx) => {
        if (!ctx.auth.user) return null
        const profile = await userProfileRepo.findByUserId(ctx.auth.user.id)
        return profile?.preferences ?? DEFAULT_USER_PREFERENCES
      }
    }
    ```
  - [ ] Cela évite de le passer dans chaque controller individuellement

- [ ] Task 3 — Appliquer le hook dans `HeroMetric.tsx` (AC: #1, #2)
  - [ ] Utiliser `useUnitConversion()` pour formater l'allure principale
  - [ ] Le badge de tendance doit aussi utiliser l'unité configurée
  - [ ] Le sparkline reste en valeur brute (visuel uniquement, pas de label)

- [ ] Task 4 — Appliquer le hook dans `QuickStatCard.tsx` (AC: #1, #2)
  - [ ] Volume : utiliser `formatDistance` pour convertir km ↔ miles
  - [ ] FC : pas de conversion (universelle en bpm)
  - [ ] Sessions : pas de conversion (count)

- [ ] Task 5 — Appliquer le hook dans `EvolutionChart.tsx` (AC: #5)
  - [ ] Axe Y : si métrique = pace, convertir les valeurs avec `convertPaceForChart`
  - [ ] Tooltip : utiliser `formatSpeed` ou `formatDistance` selon la métrique
  - [ ] **Attention** : convertir les données AVANT de les passer à Recharts (via useMemo) pour ne pas re-render inutilement

- [ ] Task 6 — Appliquer dans les pages Sessions existantes (AC: #4)
  - [ ] `Sessions/Index.tsx` — `SessionCard` : utiliser le hook pour formater distance et allure
  - [ ] `Sessions/Show.tsx` — Détail : formater distance et allure avec les préférences
  - [ ] **Attention** : ne pas casser les pages existantes. Ajouter le hook là où c'est nécessaire, ne pas modifier la logique existante

- [ ] Task 7 — Étendre `inertia/lib/format.ts` (AC: #1, #2)
  - [ ] Ajouter :
    - `paceToKmh(paceMinPerKm: number): number` → conversion pure
    - `kmToMiles(km: number): number` → conversion pure
  - [ ] Les fonctions de conversion sont pures (pas de hook), utilisables partout
  - [ ] Le hook `useUnitConversion` les utilise en interne

- [ ] Task 8 — Tests (AC: #1-5)
  - [ ] `tests/unit/lib/format.spec.ts` (ou équivalent) :
    - Test : paceToKmh(5) → 12.0
    - Test : paceToKmh(6) → 10.0
    - Test : kmToMiles(10) → 6.21
  - [ ] Tests fonctionnels :
    - Test : dashboard avec speedUnit='km_h' → props incluent les données brutes (conversion côté client)
    - Test : les données en base ne changent pas quand on change l'unité

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

### Debug Log References

### Completion Notes List

### File List
