# Story 6.2: Dashboard - QuickStatCards

Status: ready-for-dev

## Story

As a **utilisateur connecté avec des séances**,
I want **voir mes métriques secondaires en un coup d'œil**,
So that **j'ai une vue rapide sur mon volume, ma FC et ma fréquence d'entraînement** (FR18).

## Acceptance Criteria (BDD)

### AC1 — 3 QuickStatCards affichées
**Given** j'ai des séances enregistrées
**When** j'arrive sur la page d'accueil
**Then** 3 QuickStatCards s'affichent sous le HeroMetric :
- Volume hebdomadaire (km) — `Σ distances` de la semaine ISO en cours
- FC moyenne — `Σ(FC × durée) / Σ(durée)` pondérée par durée, rolling 4 sem
- Nombre de séances (cette semaine) — count semaine ISO en cours

### AC2 — Tendances affichées
**Given** j'ai assez de données (≥ 2 séances)
**When** je regarde chaque QuickStatCard
**Then** chaque carte affiche la valeur, l'unité et une tendance au format "vs [valeur] en moyenne"

### AC3 — Projection milieu de semaine
**Given** on est mercredi de la semaine en cours
**When** je regarde le volume hebdo et le nombre de séances
**Then** la comparaison est projetée au même jour (lundi-mercredi moyen des 4 sem. précédentes)

### AC4 — Layout mobile
**Given** je suis sur mobile (< 768px)
**When** je regarde les QuickStatCards
**Then** elles occupent chacune 1/3 de la largeur, compactes

### AC5 — Layout desktop
**Given** je suis sur desktop
**When** je regarde le dashboard
**Then** les QuickStatCards sont intégrées dans la grille à côté du HeroMetric

### AC6 — Pas assez de données
**Given** j'ai moins de 2 séances
**When** je regarde les QuickStatCards
**Then** elles affichent "—" sans tendance

## Tasks / Subtasks

- [ ] Task 1 — Étendre `DashboardMetrics` entité (AC: #1, #2, #3)
  - [ ] Ajouter à `app/domain/entities/dashboard_metrics.ts` :
    ```typescript
    export interface QuickStatData {
      weeklyVolumeKm: number
      weeklyVolumeTrend: number | null      // vs moyenne 4 sem. précédentes (projetée)
      weeklyVolumePreviousAvg: number | null
      avgHeartRate: number | null            // pondérée par durée, rolling 4 sem
      avgHeartRateTrend: number | null       // vs 4 sem. précédentes
      avgHeartRatePreviousAvg: number | null
      weeklySessionCount: number
      weeklySessionTrend: number | null      // vs moyenne 4 sem. précédentes (projetée)
      weeklySessionPreviousAvg: number | null
    }
    ```
  - [ ] Ajouter `quickStats: QuickStatData | null` à `DashboardMetrics`

- [ ] Task 2 — Étendre use case `GetDashboardMetrics` (AC: #1, #2, #3)
  - [ ] Calcul volume hebdo : `Σ distanceKm` des séances de la semaine ISO en cours
  - [ ] Calcul FC moyenne rolling 4 sem : `Σ(avgHeartRate × durationMinutes) / Σ(durationMinutes)` — ignorer séances sans FC
  - [ ] Calcul nb séances : count de la semaine ISO en cours
  - [ ] **Projection milieu de semaine** :
    - Déterminer le jour actuel (lundi=1...dimanche=7)
    - Pour chaque semaine des 4 précédentes, ne compter que les séances du lundi au jour actuel
    - Moyenne projetée = `Σ valeurs_partielles / 4`
  - [ ] Tendance = `valeur_courante - moyenne_projetée`
  - [ ] Retourner `null` pour quickStats si < 2 séances totales

- [ ] Task 3 — Composant `QuickStatCard.tsx` (AC: #1, #2, #4, #5, #6)
  - [ ] Créer `inertia/components/shared/QuickStatCard.tsx`
  - [ ] Props :
    ```typescript
    interface QuickStatCardProps {
      label: string
      value: string
      unit: string
      trend: number | null
      previousAvg: string | null  // "28km en moyenne", "158bpm en moyenne"
      isEmpty: boolean
    }
    ```
  - [ ] Affichage :
    - Label en petit (`text-xs text-muted-foreground`)
    - Valeur en medium-bold (`text-lg font-semibold`)
    - Unité à côté de la valeur
    - Badge tendance : vert si positif (volume/sessions: plus = mieux, FC: moins = mieux), gris sinon
    - Libellé : "vs [previousAvg] en moyenne"
  - [ ] État vide : "—"

- [ ] Task 4 — Intégrer dans `Dashboard.tsx` (AC: #1, #4, #5)
  - [ ] Ajouter les QuickStatCards sous le HeroMetric
  - [ ] Layout responsive :
    - Mobile : `grid grid-cols-3 gap-2` (1/3 chacune, compactes)
    - Desktop : intégrées dans la grille dashboard (à côté ou sous le HeroMetric selon l'espace)
  - [ ] Passer les données depuis les props Inertia

- [ ] Task 5 — Tests (AC: #1-6)
  - [ ] Étendre `tests/unit/use_cases/get_dashboard_metrics.spec.ts` :
    - Test : volume hebdo = somme des distances de la semaine ISO
    - Test : FC pondérée par durée (pas simple moyenne)
    - Test : projection milieu de semaine correcte
    - Test : tendance calculée vs moyenne projetée
    - Test : < 2 séances → quickStats null

## Dev Notes

### Architecture Compliance
- **Pas de nouveau use case** — étendre `GetDashboardMetrics` existant (story 6.1)
- **Pas de nouvelle méthode repository** — réutiliser `findByUserIdAndDateRange` de la story 6.1
- **Nouvelle entité** `QuickStatData` dans le même fichier `dashboard_metrics.ts`

### Calculs Métriques — Règles Critiques
- **FC moyenne** : pondérée par durée. Formule : `Σ(FC × durée) / Σ(durée)`. JAMAIS la simple moyenne des FC
- **Projection milieu de semaine** : si on est mercredi (jour 3), ne comparer qu'aux lundi-mercredi des 4 sem. précédentes. Cela évite de comparer une semaine partielle à des semaines complètes
- **Semaine ISO** : commence le lundi. Utiliser Luxon `DateTime.now().startOf('week')` (Luxon utilise lundi par défaut)
- **Tendance volume/sessions** : positif = mieux (on fait plus). **Tendance FC** : négatif = mieux (FC plus basse = meilleur cardio)
- **Badge couleur** : vert si tendance favorable, gris sinon. Logique inversée pour la FC

### Patterns Existants à Suivre
- Mêmes patterns que story 6.1 (injection, controller mince, composant React)
- Le composant `QuickStatCard` sera réutilisable (props génériques label/value/unit/trend)
- Layout responsive : suivre le pattern de `Sessions/Index.tsx` avec `grid` Tailwind

### Fichiers Impactés
- `app/domain/entities/dashboard_metrics.ts` — étendre (ajout QuickStatData)
- `app/use_cases/dashboard/get_dashboard_metrics.ts` — étendre
- `app/controllers/dashboard/dashboard_controller.ts` — déjà modifié en 6.1, passe les nouvelles données
- `inertia/pages/Dashboard.tsx` — étendre
- `inertia/components/shared/QuickStatCard.tsx` — NOUVEAU
- `inertia/lib/format.ts` — potentiellement étendre (formatage FC, volume)

### Dépendances
- **Story 6.1 DOIT être implémentée avant** (entité DashboardMetrics, use case, controller, page Dashboard)

### References
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Story 6.2]
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Decisions metriques et calculs]
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Regles de calcul — Projection milieu de semaine]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
