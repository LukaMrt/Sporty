# Story 12.12 : Widget dashboard — Prochaine seance

Status: review

## Story

As a **coureur**,
I want **voir ma prochaine seance planifiee sur le dashboard**,
So that **j'ai un rappel immediat sans naviguer vers la page planning**.

## Acceptance Criteria

1. **Given** j'ai un plan actif avec une seance a venir **When** j'accede au dashboard **Then** je vois un widget avec jour, type, duree et resume de la seance
2. **Given** la prochaine seance est aujourd'hui **When** le widget est affiche **Then** il a une bordure accent bleu et le label "Aujourd'hui"
3. **Given** c'est un jour de repos **When** le widget est affiche **Then** il indique "Repos aujourd'hui. Prochaine seance : [jour]"
4. **Given** je n'ai pas de plan actif **When** j'accede au dashboard **Then** le widget n'est pas affiche
5. **Given** je tape sur le widget **When** la navigation se declenche **Then** je suis redirige vers `/planning` avec focus sur la semaine courante
6. **Given** mon plan est termine **When** le widget est affiche **Then** il indique "Plan termine ! Voir les options →"

## Tasks / Subtasks

- [x] Task 1 : Use case GetNextSession (AC: #1, #3)
  - [x] Creer `app/use_cases/planning/get_next_session.ts`
  - [x] Retourne la prochaine seance planifiee non completee, ou null
- [x] Task 2 : Composant NextSessionWidget (AC: #1-#6)
  - [x] Creer `inertia/components/planning/NextSessionWidget.tsx`
  - [x] Etats : seance a venir, aujourd'hui, repos, plan termine, pas de plan
- [x] Task 3 : Integration dashboard (AC: #1, #4)
  - [x] Integrer `NextSessionWidget` dans `inertia/pages/Dashboard.tsx` (ou equivalent)
  - [x] Passer les donnees depuis le controller dashboard
- [x] Task 4 : Controller dashboard
  - [x] Modifier le controller dashboard pour inclure la prochaine seance dans les props Inertia

## Dev Notes

### Placement dans le dashboard

Le widget s'insere entre les quick stats et la timeline des seances passees, conformement au UX design.

### References

- [UX Design section 5](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#5)
- [PRD FR24](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)

## Dev Agent Record

### Implementation Plan

- Use case `GetNextSession` : calcule la date absolue de chaque session (même logique que `sessionDate()` dans `Planning/Index.tsx`), filtre les sessions pending non-rest, retourne un discriminated union (null / plan_completed / upcoming / rest_today).
- Controller dashboard modifié pour appeler `GetNextSession` en parallèle via `Promise.all`.
- Composant `NextSessionWidget` : 4 états visuels, navigation vers `/planning` au clic, réutilise `ZONE_COLORS` et les clés i18n `planning.sessions.types.*`.
- Traductions ajoutées dans `resources/lang/fr/dashboard.json`.

### Completion Notes

✅ Task 1 : `GetNextSession` use case + 5 tests unitaires (no plan, plan completed, past sessions, today, rest day, rest-type session skip)
✅ Task 2 : `NextSessionWidget` — états upcoming/today/rest_today/plan_completed/null
✅ Task 3 : `NextSessionWidget` intégré dans `Dashboard.tsx`, positionné entre hero et quick stats
✅ Task 4 : `DashboardController` mis à jour, appel parallèle avec `Promise.all`

### File List

- app/use_cases/planning/get_next_session.ts (new)
- tests/unit/use_cases/planning/get_next_session.spec.ts (new)
- inertia/components/planning/NextSessionWidget.tsx (new)
- inertia/pages/Dashboard.tsx (modified)
- app/controllers/dashboard/dashboard_controller.ts (modified)
- resources/lang/fr/dashboard.json (modified)

### Change Log

- 2026-03-24 : Story 12.12 implémentée — widget prochaine séance sur le dashboard
