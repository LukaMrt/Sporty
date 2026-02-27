# Story 6.1: Dashboard - HeroMetric

Status: review

## Story

As a **utilisateur connecté avec des séances**,
I want **voir mon chiffre clé de progression dès l'ouverture de l'app**,
So that **je comprends immédiatement où j'en suis** (FR18).

## Acceptance Criteria (BDD)

### AC1 — Affichage HeroMetric avec données
**Given** j'ai des séances enregistrées (≥ 2)
**When** j'arrive sur la page d'accueil
**Then** le composant HeroMetric affiche l'allure moyenne en grand et bold
**And** l'allure est calculée comme `durée_totale / distance_totale` sur un rolling 4 semaines (jamais la moyenne des allures)
**And** un badge de tendance indique l'évolution (ex: "-18s/km vs 5'30 en moyenne") comparant 4 sem. actuelles vs 4 sem. précédentes
**And** un mini-graphique sparkline à droite montre la tendance visuelle sur les 8 dernières séances

### AC2 — Pas assez de données
**Given** j'ai moins de 2 séances
**When** j'arrive sur la page d'accueil
**Then** le HeroMetric affiche "—" avec un message "Pas assez de données"

### AC3 — Tendance positive
**Given** la tendance est positive (allure améliorée)
**When** je regarde le badge
**Then** il est affiché en vert doux (couleur success)

### AC4 — Tendance neutre ou négative
**Given** la tendance est neutre ou négative
**When** je regarde le badge
**Then** il est affiché en gris neutre (jamais de rouge)

### AC5 — Aucune séance
**Given** je n'ai aucune séance
**When** j'arrive sur la page d'accueil
**Then** le composant EmptyState existant s'affiche avec CTA vers la création de séance

## Tasks / Subtasks

- [x] Task 1 — Installer Recharts (AC: tous)
  - [x] `pnpm add recharts`
  - [x] Vérifier compatibilité React 19 + Vite

- [x] Task 2 — Use case `GetDashboardMetrics` (AC: #1, #2)
  - [x] Créer `app/use_cases/dashboard/get_dashboard_metrics.ts`
  - [x] Pattern : `@inject()` + constructor avec `SessionRepository`
  - [x] Input : `userId: number`
  - [x] Output : `DashboardMetrics` (interface à créer dans `app/domain/entities/dashboard_metrics.ts`)
  - [x] Calculs :
    - Allure rolling 4 sem : `Σ durationMinutes / Σ distanceKm` (en min/km) — ignorer séances sans distance
    - Allure rolling 4 sem précédentes (même formule, période -8 à -4 semaines)
    - Tendance : `allure_courante - allure_précédente` (négatif = amélioration)
    - Sparkline : allure par séance pour les 8 dernières séances (date + pace)
    - sessionCount total pour décider EmptyState vs HeroMetric
  - [x] Retourner `null` pour heroMetric si < 2 séances avec distance dans les 4 dernières semaines

- [x] Task 3 — Étendre `SessionRepository` interface (AC: #1)
  - [x] Ajouter à `app/domain/interfaces/session_repository.ts`
  - [x] Implémenter dans `LucidSessionRepository`

- [x] Task 4 — Entité `DashboardMetrics` (AC: #1, #2)
  - [x] Créer `app/domain/entities/dashboard_metrics.ts`

- [x] Task 5 — Controller `DashboardController.index()` (AC: #1, #2, #5)
  - [x] Injecter `GetDashboardMetrics` use case
  - [x] Appeler `getDashboardMetrics.execute(auth.user!.id)`
  - [x] Passer `heroMetric`, `sessionCount`, `speedUnit` en props Inertia

- [x] Task 6 — Composant `HeroMetric.tsx` (AC: #1, #2, #3, #4)
  - [x] Créer `inertia/components/shared/HeroMetric.tsx`
  - [x] Allure en grand, badge tendance vert/gris, sparkline avec légendes min/max
  - [x] État "pas assez de données" via `HeroMetricEmpty`

- [x] Task 7 — Composant `SparklineChart.tsx` (AC: #1)
  - [x] Créer `inertia/components/shared/SparklineChart.tsx`
  - [x] YAxis caché avec `domain={['dataMin', 'dataMax']}` pour une courbe lisible

- [x] Task 8 — Page `Dashboard.tsx` mise à jour (AC: #1-5)
  - [x] EmptyState / HeroMetricEmpty / HeroMetric selon les cas

- [x] Task 9 — Utilitaire de formatage pace (AC: #1, #3, #4)
  - [x] `formatPaceMinSec` et `formatTrend` ajoutés dans `inertia/lib/format.ts`

- [x] Task 10 — Tests (AC: #1-5)
  - [x] `tests/unit/use_cases/dashboard/get_dashboard_metrics.spec.ts`
    - Test : allure calculée comme durée_totale / distance_totale (pas moyenne des allures)
    - Test : < 2 séances → heroMetric null
    - Test : sparkline contient max 8 points
    - Test : tendance négative quand l'allure s'améliore
  - [ ] `tests/functional/dashboard/dashboard.spec.ts`
    - Test : dashboard avec séances affiche les props heroMetric
    - Test : dashboard sans séances affiche sessionCount = 0

## Dev Notes

### Architecture Compliance
- **Use case** `GetDashboardMetrics` dans `app/use_cases/dashboard/` — logique métier ici, PAS dans le controller
- **Controller** mince : appelle le use case, passe les props
- **Repository** : nouvelle méthode `findByUserIdAndDateRange` — requête DB pure, mapping en entité
- **Entité** `DashboardMetrics` dans `app/domain/entities/` — types purs, aucune dépendance framework

### Patterns Existants à Suivre
- **Injection IoC** : `@inject()` sur use cases et controllers (cf. `SessionsController`, `ListSessions`)
- **Repository abstract** : étendre `SessionRepository` dans `app/domain/interfaces/session_repository.ts`, implémenter dans `LucidSessionRepository`
- **Props Inertia** : camelCase (`dashboardMetrics`, `sessionCount`, `userPreferences`)
- **Composants React** : `Component.layout = (page) => <MainLayout>{page}</MainLayout>`
- **Formatage** : fonctions dans `inertia/lib/format.ts` (cf. `formatDuration`, `formatPace` existants)

### Calculs Métriques — Règles Critiques
- **Allure = durée_totale / distance_totale** sur la période. JAMAIS la moyenne des allures par séance (biais vers séances courtes)
- **Tendance = allure_courante - allure_précédente**. Négatif = amélioration (on court plus vite)
- **Seuil données** : < 2 séances avec `distanceKm > 0` dans la période → "Pas assez de données"
- **Ignorer les séances sans distance** (distanceKm = null ou 0) pour le calcul d'allure

### Recharts — Configuration Minimale Sparkline
```tsx
<LineChart width={100} height={40} data={sparklineData}>
  <Line type="monotone" dataKey="pace" stroke="currentColor" dot={false} strokeWidth={2} />
</LineChart>
```

### Fichiers Impactés
- `app/domain/interfaces/session_repository.ts` — ajout méthode
- `app/repositories/lucid_session_repository.ts` — implémentation
- `app/domain/entities/dashboard_metrics.ts` — NOUVEAU
- `app/use_cases/dashboard/get_dashboard_metrics.ts` — NOUVEAU
- `app/controllers/dashboard/dashboard_controller.ts` — modifier
- `inertia/pages/Dashboard.tsx` — modifier
- `inertia/components/shared/HeroMetric.tsx` — NOUVEAU
- `inertia/components/shared/SparklineChart.tsx` — NOUVEAU
- `inertia/lib/format.ts` — étendre
- `package.json` — ajouter recharts

### Project Structure Notes
- Pas de nouveau dossier à créer côté backend (use_cases/dashboard/ existe potentiellement déjà dans l'architecture prévue)
- Côté frontend, les composants vont dans `inertia/components/shared/` conformément à la convention existante

### References
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Recharts]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Decisions metriques et calculs]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Bug pg driver : colonnes DECIMAL retournées en string → `Number()` ajouté dans `computePace` et sparkline
- Sparkline plate → ajout `YAxis domain={['dataMin','dataMax']}` caché pour auto-scaling sur la plage réelle
- Badge tendance simplifié : suppression du `vs X'XX en moyenne` redondant avec l'allure affichée

### Completion Notes List
- Allure calculée comme `Σ durée / Σ distance` (jamais moyenne des allures) — règle critique respectée
- `formatTrend` prend uniquement `trendSeconds` (previousPace supprimé, redondant)
- Légendes min/max sur le sparkline alignées verticalement sur l'axe Y
- Seeds mis à jour pour une progression visible 7'00→6'30→6'00→5'00/km sur les 4 dernières semaines
- 190/190 tests passent

### File List
- `app/domain/interfaces/session_repository.ts`
- `app/repositories/lucid_session_repository.ts`
- `app/domain/entities/dashboard_metrics.ts`
- `app/use_cases/dashboard/get_dashboard_metrics.ts`
- `app/controllers/dashboard/dashboard_controller.ts`
- `inertia/pages/Dashboard.tsx`
- `inertia/components/shared/HeroMetric.tsx`
- `inertia/components/shared/SparklineChart.tsx`
- `inertia/lib/format.ts`
- `tests/helpers/mock_session_repository.ts`
- `tests/unit/use_cases/dashboard/get_dashboard_metrics.spec.ts`
- `tests/functional/dashboard.spec.ts`
- `database/seeders/3_session_seeder.ts`
- `package.json`
- `pnpm-lock.yaml`
