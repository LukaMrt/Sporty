# Story 12.13 : Ajustement manuel du plan

Status: done

## Story

As a **coureur**,
I want **deplacer ou modifier des seances individuelles dans mon plan**,
So that **je peux adapter le plan a mes contraintes quotidiennes**.

## Acceptance Criteria

1. **Given** une seance a venir **When** je la deplace **Then** elle change de jour (dans la meme semaine) et le plan est mis a jour
2. **Given** une seance a venir **When** je modifie son allure ou sa duree **Then** la modification est locale a cette seance (ne regenere pas le reste du plan)
3. **Given** une seance a venir **When** je la lie manuellement a une seance realisee **Then** le `completedSessionId` est mis a jour et le statut passe a 'completed'
4. **Given** une seance realisee sans lien **When** je veux la saisir rapidement **Then** un formulaire pre-rempli avec les cibles du plan est propose
5. **Given** une action d'ajustement **When** le plan est consulte ensuite **Then** les modifications sont bien refletees

## Tasks / Subtasks

- [x] Task 1 : Use cases (AC: #1, #2, #3)
  - [x] Creer `app/use_cases/planning/adjust_plan.ts` — deplacer ou modifier une seance
  - [x] Creer `app/use_cases/planning/link_completed_session.ts` — lier seance planifiee ↔ realisee
- [x] Task 2 : Controller (AC: #1-#4)
  - [x] `PlanningController.updateSession()` → deplacer, modifier allure/duree
  - [x] Route : `PUT /planning/sessions/:id`
- [x] Task 3 : Validator
  - [x] Validation : dayOfWeek (0-6), targetDurationMinutes (> 0), targetPacePerKm (format MM:SS)
- [x] Task 4 : UI — Actions sur carte seance (AC: #1, #2, #4)
  - [x] Drag & drop (@dnd-kit/core) sur `WeekDndView` — drop uniquement sur jours de repos
  - [x] Bottom sheet "Modifier" → champs allure, duree (`EditSessionSheet`)
  - [x] Mise a jour optimiste + rollback sur erreur serveur

## Dev Notes

### Les modifications sont locales

Modifier une seance ne declenche PAS de recalibration. C'est un ajustement manuel. La recalibration se declenche uniquement apres une seance realisee (story 12.15).

### References

- [UX Design section 3.4](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#3)
- [PRD FR27, FR28](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
