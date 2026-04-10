# Story 12.18 : Historique des plans

Status: done

## Story

As a **coureur**,
I want **consulter l'historique de mes anciens plans (termines ou abandonnes)**,
So that **je vois ma progression sur le long terme**.

## Acceptance Criteria

1. **Given** je suis connecte **When** j'accede a `/planning/history` **Then** je vois la liste de mes anciens plans avec objectif, dates, statut, progression VDOT et taux de completion
2. **Given** un plan termine **When** sa carte est affichee **Then** elle montre ✅ Termine en vert, VDOT debut → fin, X/Y seances realisees
3. **Given** un plan abandonne **When** sa carte est affichee **Then** elle montre ○ Abandonne en gris neutre (zero jugement)
4. **Given** je tape sur un ancien plan **When** le detail s'ouvre **Then** je vois la meme vue semaine que le plan actif, mais en lecture seule
5. **Given** je n'ai aucun plan historise **When** j'accede a la page **Then** un etat vide indique "Pas encore de plan termine"

## Tasks / Subtasks

- [x] Task 1 : Use case GetPlanHistory (AC: #1)
  - [x] Creer `app/use_cases/planning/get_plan_history.ts`
  - [x] Retourne les plans avec status completed ou abandoned, tries par date desc
- [x] Task 2 : Controller routes (AC: #1, #4)
  - [x] Route `GET /planning/history` → liste des plans
  - [x] Route `GET /planning/history/:id` → detail plan archive
- [x] Task 3 : Page React (AC: #1-#5)
  - [x] Creer `inertia/pages/Planning/History.tsx` — liste des anciens plans
  - [x] Creer `inertia/components/planning/PlanHistoryCard.tsx` — carte resume
  - [x] Vue detail plan archive : reutiliser les composants de la page planning en mode lecture seule (pas de swipe actions, pas de toggle recalibration)

## Dev Notes

### L'historique est une fierte

Les anciens plans montrent la progression (VDOT debut → fin). C'est un journal d'accomplissement, pas un rappel d'echecs. Les plans abandonnes sont affiches sans jugement.

### Lecture seule

La vue detail reutilise `WeekSelector`, `PlannedSessionCard`, etc. mais avec un prop `readOnly` qui desactive les actions.

### References

- [UX Design section 7](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#7)
- [PRD FR22](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
