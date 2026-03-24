# Story 12.11 : Page /planning — Vue semaine du plan actif

Status: review

## Story

As a **coureur**,
I want **consulter mon plan sur une page dediee avec vue par semaine scrollable**,
So that **je sais quoi faire chaque jour et je suis ma progression**.

## Acceptance Criteria

1. **Given** j'ai un plan actif **When** j'accede a `/planning` **Then** je vois le bandeau objectif, la navigation semaines et le detail de la semaine courante
2. **Given** la vue semaine **When** elle est affichee **Then** chaque jour est liste avec sa seance (ou "Repos"), les cartes montrent type, duree, zone, allure, statut
3. **Given** le bandeau objectif **When** il est affiche **Then** je vois distance + temps cible, date evenement, semaine courante/total, phase courante (label simple par defaut)
4. **Given** la navigation semaines **When** je swipe horizontalement **Then** je navigue entre les semaines — la semaine courante est centree avec dot bleu
5. **Given** une seance realisee **When** elle est liee **Then** la carte affiche ✅ avec allure reelle et duree reelle
6. **Given** une seance manquee **When** la semaine est passee **Then** la carte est grisee avec "Non realisee" (zero jugement)
7. **Given** je n'ai pas de plan actif **When** j'accede a `/planning` **Then** je vois l'etat vide avec CTA "Definir un objectif" et lien historique
8. **Given** le resume hebdomadaire **When** il est affiche **Then** je vois volume total, nombre de seances et indicateur de charge (vert/bleu/orange)
9. **Given** le tap sur une carte seance **When** le detail s'ouvre **Then** je vois la vue complete avec intervalles, comparaison prevu/realise si liee
10. **Given** le layout desktop (> 768px) **When** la page est affichee **Then** la grille 2 colonnes + panneau lateral est utilisee

## Tasks / Subtasks

- [x] Task 1 : Use cases lecture (AC: prerequis)
  - [x] Creer `app/use_cases/planning/get_plan_overview.ts` — plan actif + semaines + seances de la semaine courante
  - [x] Creer `app/use_cases/planning/get_week_detail.ts` — seances d'une semaine donnee
- [x] Task 2 : Controller routes (AC: #1, #7)
  - [x] `PlanningController.index()` → page plan actif ou etat vide
  - [x] `PlanningController.weekDetail()` → detail semaine (API JSON pour navigation cote client)
  - [x] Routes : `GET /planning`, `GET /planning/week/:weekNumber`
- [x] Task 3 : Page React Index (AC: #1, #7, #10)
  - [x] Creer `inertia/pages/Planning/Index.tsx`
  - [x] Etat vide (pas de plan actif) avec CTA
  - [x] Layout responsive (mobile colonne unique, desktop grille)
- [x] Task 4 : Composants planning (AC: #2, #3, #4, #8)
  - [x] Creer `inertia/components/planning/GoalBanner.tsx`
  - [x] Creer `inertia/components/planning/WeekSelector.tsx` (navigation horizontale scrollable)
  - [x] Creer `inertia/components/planning/WeekSummary.tsx` (volume, charge, nb seances)
  - [x] Creer `inertia/components/planning/PlannedSessionCard.tsx` (carte seance avec dot couleur zone)
- [x] Task 5 : Vue detail seance (AC: #9)
  - [x] Creer `inertia/components/planning/PlannedSessionDetail.tsx` (vue plein ecran ou modale)
  - [x] Creer `inertia/components/planning/IntervalBreakdown.tsx` (blocs empiles avec rail de connexion)
  - [x] Creer `inertia/components/planning/ComparisonBlock.tsx` (prevu vs realise)
- [x] Task 6 : Navigation tab (AC: #1)
  - [x] Ajouter l'onglet "Planning" dans la bottom tab bar / sidebar

## Dev Agent Record

### Completion Notes

Story implementee le 2026-03-24. Tous les composants React ont ete crees (GoalBanner, WeekSelector, WeekSummary, PlannedSessionCard, PlannedSessionDetail, IntervalBreakdown, ComparisonBlock), les use cases get_plan_overview et get_week_detail ont ete implementes, le controller planning avec les routes GET /planning et GET /planning/week/:weekNumber est en place, et la page Index.tsx gere l'etat vide et le layout responsive.

### File List

- app/use_cases/planning/get_plan_overview.ts
- app/use_cases/planning/get_week_detail.ts
- app/controllers/planning/planning_controller.ts
- app/domain/entities/planned_session.ts
- app/models/planned_session.ts
- app/models/training_plan.ts
- app/repositories/lucid_training_plan_repository.ts
- app/use_cases/planning/generate_plan.ts
- database/migrations/1774339271076_alter_planned_sessions_table.ts
- inertia/components/planning/ComparisonBlock.tsx
- inertia/components/planning/GoalBanner.tsx
- inertia/components/planning/IntervalBreakdown.tsx
- inertia/components/planning/PlannedSessionCard.tsx
- inertia/components/planning/PlannedSessionDetail.tsx
- inertia/components/planning/WeekSelector.tsx
- inertia/components/planning/WeekSummary.tsx
- inertia/lib/format.ts
- inertia/lib/planning_colors.ts
- inertia/pages/Planning/GoalCreate.tsx
- inertia/pages/Planning/Index.tsx
- inertia/types/planning.ts
- resources/lang/en/planning.json
- resources/lang/fr/planning.json
- resources/views/inertia_layout.edge
- start/routes.ts

### Change Log

- 2026-03-24 : Implementation complete de la story 12.11 — page /planning avec vue semaine, composants, use cases, controller et navigation tab

## Dev Notes

### Dot couleur par zone

| Zone | Couleur |
|------|---------|
| E | Vert doux |
| M | Bleu |
| T | Orange doux |
| I | Rouge doux |
| R | Violet doux |

Le rouge indique l'intensite, pas un probleme — coherent avec le principe "pas de rouge pour les echecs".

### Etats de la carte seance

- A venir : opacite normale, dot vide ○
- Aujourd'hui : bordure accent bleu
- Realisee : dot vert ✅, resultats en sous-titre
- Manquee : dot gris barre, texte gris neutre

### Allures

Affichees dans l'unite preferee de l'utilisateur (min/km ou km/h). Preference stockee en localStorage.

### References

- [UX Design sections 2, 3](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md)
- [PRD FR23, FR25, FR26](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
