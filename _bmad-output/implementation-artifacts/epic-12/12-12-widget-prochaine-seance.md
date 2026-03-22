# Story 12.12 : Widget dashboard — Prochaine seance

Status: pending

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

- [ ] Task 1 : Use case GetNextSession (AC: #1, #3)
  - [ ] Creer `app/use_cases/planning/get_next_session.ts`
  - [ ] Retourne la prochaine seance planifiee non completee, ou null
- [ ] Task 2 : Composant NextSessionWidget (AC: #1-#6)
  - [ ] Creer `inertia/components/planning/NextSessionWidget.tsx`
  - [ ] Etats : seance a venir, aujourd'hui, repos, plan termine, pas de plan
- [ ] Task 3 : Integration dashboard (AC: #1, #4)
  - [ ] Integrer `NextSessionWidget` dans `inertia/pages/Dashboard.tsx` (ou equivalent)
  - [ ] Passer les donnees depuis le controller dashboard
- [ ] Task 4 : Controller dashboard
  - [ ] Modifier le controller dashboard pour inclure la prochaine seance dans les props Inertia

## Dev Notes

### Placement dans le dashboard

Le widget s'insere entre les quick stats et la timeline des seances passees, conformement au UX design.

### References

- [UX Design section 5](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#5)
- [PRD FR24](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
