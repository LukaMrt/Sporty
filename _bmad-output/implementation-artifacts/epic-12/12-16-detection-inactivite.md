# Story 12.16 : Detection d'inactivite

Status: pending

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

- [ ] Task 1 : Detection d'inactivite (AC: #2, #4)
  - [ ] Logique dans `GetPlanOverview` : calculer les jours depuis la derniere seance
  - [ ] Retourner un flag `inactivityLevel: 'none' | 'warning' | 'critical'` dans les props
- [ ] Task 2 : Gestion seance manquee (AC: #1)
  - [ ] Dans RecalibratePlan : detecter seance planifiee non realisee
  - [ ] Reporter max 1 seance qualite au prochain créneau disponible
- [ ] Task 3 : UI — Banniere inactivite (AC: #2, #4)
  - [ ] Creer `inertia/components/planning/InactivityBanner.tsx`
  - [ ] Ton neutre, bienveillant, 3 options
  - [ ] Variante > 14 jours vs > 4 semaines
- [ ] Task 4 : Actions de reprise (AC: #3, #5)
  - [ ] "Reprendre" → recalibration avec charge reduite
  - [ ] "Nouveau plan" → abandon plan actif + redirect wizard
  - [ ] Estimation VDOT reduit selon duree inactivite (perte ~7% apres 2-4 semaines, ~15% apres 8 semaines)

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
