# Story 12.16 : Detection d'inactivite

Status: review

## Story

As a **coureur**,
I want **etre averti si je n'ai pas couru depuis longtemps et recevoir des propositions adaptees**,
So that **je peux reprendre en securite sans me blesser**.

## Acceptance Criteria

1. **Given** une seance manquee ponctuelle **When** le systeme la detecte **Then** il peut reporter ou compenser (max 1 seance qualite decalee)
2. **Given** une inactivite > 14 jours **When** je consulte la page planning **Then** une banniere propose : "Reprendre le plan" / "Nouveau plan" / "Plus tard"
3. **Given** je choisis "Reprendre le plan" **When** le plan est recalibre **Then** les seances restantes sont ajustees a la baisse
4. **Given** une inactivite > 4 semaines **When** je consulte la page planning **Then** une banniere propose un nouveau plan avec VDOT reduit estime
5. **Given** je choisis "Nouveau plan" **When** le flow se declenche **Then** l'ancien plan est abandonne et je suis redirige vers le wizard

## Tasks / Subtasks

- [x] Task 1 : Detection d'inactivite (AC: #2, #4)
  - [x] Logique dans `GetPlanOverview` : calculer les jours depuis la derniere seance
  - [x] Retourner un flag `inactivityLevel: 'none' | 'warning' | 'critical'` dans les props
- [x] Task 2 : Gestion seance manquee (AC: #1)
  - [x] Dans RecalibratePlan : detecter seance planifiee non realisee
  - [x] Reporter max 1 seance qualite au prochain créneau disponible
- [x] Task 3 : UI — Banniere inactivite (AC: #2, #4)
  - [x] Creer `inertia/components/planning/InactivityBanner.tsx`
  - [x] Ton neutre, bienveillant, 3 options
  - [x] Variante > 14 jours vs > 4 semaines
- [x] Task 4 : Actions de reprise (AC: #3, #5)
  - [x] "Reprendre" → recalibration avec charge reduite
  - [x] "Nouveau plan" → abandon plan actif + redirect wizard
  - [x] Estimation VDOT reduit selon duree inactivite (perte ~7% apres 2-4 semaines, ~15% apres 8 semaines)

## Dev Agent Record

### Completion Notes

- **Task 1** : `GetPlanOverview` expose désormais `inactivityLevel` ('none'|'warning'|'critical') et `daysSinceLastSession`. La requête sessions (365j) est faite une seule fois et partagée entre fitness profile et calcul inactivité. Seuils : warning ≥ 14j, critical ≥ 28j.
- **Task 2** : `RecalibratePlan` détecte les séances qualité (tempo/interval/répétition) `pending` dont la date est passée dans la semaine courante et reporte la première au premier créneau libre de la semaine suivante. Le fetch de `allPlannedSessions` est mutualisé en tête d'execute.
- **Task 3** : `InactivityBanner.tsx` affiche le bon message selon le niveau (bleu=warning, amber=critical) avec 3 actions : Reprendre / Nouveau plan / Plus tard. Intégré dans `Planning/Index.tsx` avec un state `inactivityDismissed`.
- **Task 4** : `ResumeFromInactivity` use case : réduction VDOT selon table Hickson (3%/14j, 7%/28j, 15%/56j+) avec interpolation linéaire. Facteur charge réduit (0.6–0.8). `InactivityController` gère les deux routes POST.

### File List

- `app/use_cases/planning/get_plan_overview.ts` — modifié
- `app/use_cases/planning/recalibrate_plan.ts` — modifié
- `app/use_cases/planning/resume_from_inactivity.ts` — créé
- `app/controllers/planning/inactivity_controller.ts` — créé
- `app/controllers/planning/planning_controller.ts` — modifié
- `inertia/components/planning/InactivityBanner.tsx` — créé
- `inertia/pages/Planning/Index.tsx` — modifié
- `inertia/types/planning.ts` — modifié
- `start/routes.ts` — modifié
- `resources/lang/fr/planning.json` — modifié
- `resources/lang/en/planning.json` — modifié
- `tests/unit/use_cases/planning/get_plan_overview.spec.ts` — modifié
- `tests/unit/use_cases/planning/resume_from_inactivity.spec.ts` — créé

### Change Log

- Story 12.16 : détection d'inactivité, bannière UI adaptative, reprise sécurisée avec réduction VDOT (Hickson 1985) (Date: 2026-04-06)

## Dev Notes

### Estimation de la perte de VO₂max

| Inactivite | Perte estimee |
|------------|---------------|
| 2 semaines | ~3-5% |
| 4 semaines | ~7% |
| 8 semaines | ~15% |

Source : Hickson (1985)

### References

- [UX Design section 8.1 cas 4](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#8)
- [PRD FR36, FR37, FR38](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
