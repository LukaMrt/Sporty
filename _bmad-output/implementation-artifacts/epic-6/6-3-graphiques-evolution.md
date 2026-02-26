# Story 6.3: Graphiques d'évolution

Status: ready-for-dev

## Story

As a **utilisateur connecté avec des séances**,
I want **visualiser l'évolution de mes données sur le temps**,
So that **je VOIS ma progression concrètement** (FR19).

## Acceptance Criteria (BDD)

### AC1 — Graphique d'évolution affiché
**Given** j'ai des séances sur plusieurs semaines
**When** je scroll sous les QuickStatCards sur la page d'accueil
**Then** un graphique Recharts affiche l'évolution de l'allure moyenne par séance (courbe)

### AC2 — Basculer entre métriques
**Given** je suis sur le graphique d'évolution
**When** je bascule entre les métriques (allure, FC moyenne, volume)
**Then** la courbe change pour afficher la métrique sélectionnée

### AC3 — Tooltip au survol/tap
**Given** je survole (desktop) ou tape (mobile) sur un point du graphique
**When** le tooltip s'affiche
**Then** il montre la date et la valeur exacte de cette séance

### AC4 — Peu de données
**Given** j'ai < 3 séances
**When** le graphique se charge
**Then** il affiche les points disponibles sans message d'erreur

### AC5 — Performance
**Given** j'ai beaucoup de données (~500 séances)
**When** le graphique se charge
**Then** il s'affiche de manière fluide en moins de 2 secondes (NFR2)

## Tasks / Subtasks

- [ ] Task 1 — Étendre `DashboardMetrics` entité (AC: #1, #2)
  - [ ] Ajouter à `app/domain/entities/dashboard_metrics.ts` :
    ```typescript
    export interface ChartDataPoint {
      date: string          // ISO date
      pace: number | null   // min/km (null si pas de distance)
      heartRate: number | null
      distance: number | null  // km
    }
    export interface ChartData {
      points: ChartDataPoint[]
    }
    ```
  - [ ] Ajouter `chartData: ChartData | null` à `DashboardMetrics`

- [ ] Task 2 — Étendre use case `GetDashboardMetrics` (AC: #1, #2, #5)
  - [ ] Récupérer toutes les séances utilisateur (non supprimées) ordonnées par date
  - [ ] Pour chaque séance, calculer : date, allure (duration/distance), FC, distance
  - [ ] Retourner les points ordonnés chronologiquement
  - [ ] **Performance** : une seule requête DB, pas de N+1
  - [ ] Si 0 séances → `chartData = null`

- [ ] Task 3 — Composant `EvolutionChart.tsx` (AC: #1, #2, #3, #4)
  - [ ] Créer `inertia/components/shared/EvolutionChart.tsx`
  - [ ] Props :
    ```typescript
    interface EvolutionChartProps {
      data: ChartDataPoint[]
      defaultMetric?: 'pace' | 'heartRate' | 'distance'
    }
    ```
  - [ ] Utiliser Recharts `ResponsiveContainer` + `LineChart`
  - [ ] Sélecteur de métrique : 3 boutons/tabs (Allure, FC, Volume)
    - Utiliser un state local React pour la métrique active
  - [ ] Configuration Recharts :
    ```tsx
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={filteredData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={formatChartDate} />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey={activeMetric} stroke="var(--color-primary)" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
    ```
  - [ ] Tooltip personnalisé : date formatée + valeur avec unité
  - [ ] Filtrer les points `null` pour la métrique sélectionnée (ne pas afficher les séances sans FC si métrique = FC)
  - [ ] Pour la métrique "Volume", afficher la distance cumulée par semaine (agrégation frontend) OU la distance par séance

- [ ] Task 4 — Sélecteur de métrique (AC: #2)
  - [ ] 3 boutons inline (style tabs) : "Allure", "FC", "Distance"
  - [ ] Utiliser les composants shadcn existants ou des boutons avec variante `ghost`/`outline`
  - [ ] État actif visuellement distinct (variante `default` ou border)

- [ ] Task 5 — Intégrer dans `Dashboard.tsx` (AC: #1-5)
  - [ ] Ajouter le graphique sous les QuickStatCards
  - [ ] Wrapper dans une Card shadcn avec titre "Évolution"
  - [ ] N'afficher que si `chartData` existe et a des points
  - [ ] Layout responsive : pleine largeur mobile et desktop

- [ ] Task 6 — Utilitaires de formatage chart (AC: #3)
  - [ ] Ajouter dans `inertia/lib/format.ts` :
    - `formatChartDate(isoDate: string): string` → "3 jan", "15 fév"
    - `formatChartValue(value: number, metric: string): string` → "5'12/km", "158 bpm", "12.5 km"

- [ ] Task 7 — Tests (AC: #1-5)
  - [ ] Étendre `tests/unit/use_cases/get_dashboard_metrics.spec.ts` :
    - Test : chartData contient un point par séance
    - Test : allure calculée correctement pour chaque point
    - Test : 0 séances → chartData null
  - [ ] `tests/functional/dashboard/dashboard.spec.ts` :
    - Test : props incluent chartData avec les bons points

## Dev Notes

### Architecture Compliance
- **Pas de nouveau use case** — étendre `GetDashboardMetrics` (déjà étendu en 6.2)
- **Pas de nouvelle méthode repository** — `findByUserIdAndDateRange` ou `findAllByUserId` suffisent
- Les données chart sont pré-calculées côté serveur pour éviter les calculs lourds côté client
- Le switch de métrique est géré en state local React (pas de requête serveur, les 3 métriques sont dans les mêmes points)

### Recharts — Bonnes Pratiques
- **`ResponsiveContainer`** obligatoire pour le responsive (pas de width/height fixes)
- **Tooltip** : utiliser un composant custom pour formater date + valeur avec unité
- **Performance ~500 points** : Recharts gère bien ce volume, pas de virtualisation nécessaire
- **Couleur** : utiliser les CSS variables Tailwind (`var(--color-primary)`) pour cohérence thème
- **Pas d'animation** sur les transitions de métrique (éviter le jank)

### Patterns Existants à Suivre
- Composants tabs : pattern boutons avec état actif (cf. `SessionFilters.tsx` pour le pattern sélection)
- Card wrapper : utiliser le composant Card shadcn (`inertia/components/ui/card.tsx`)

### Fichiers Impactés
- `app/domain/entities/dashboard_metrics.ts` — étendre (ajout ChartData)
- `app/use_cases/dashboard/get_dashboard_metrics.ts` — étendre
- `inertia/pages/Dashboard.tsx` — étendre
- `inertia/components/shared/EvolutionChart.tsx` — NOUVEAU
- `inertia/lib/format.ts` — étendre (formatChartDate, formatChartValue)

### Dépendances
- **Stories 6.1 et 6.2 DOIVENT être implémentées avant** (use case, entité, page Dashboard)

### References
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Recharts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
