# Story 12.14 : Warning ACWR & donnees techniques

Status: pending

## Story

As a **coureur avance**,
I want **voir un warning quand ma charge est trop elevee (ACWR > 1.3) et pouvoir activer les donnees techniques**,
So that **je peux prevenir les blessures et comprendre les metriques de mon plan**.

## Acceptance Criteria

1. **Given** mon ACWR > 1.3 **When** je consulte mon plan **Then** une banniere warning s'affiche en haut (ton bienveillant, fond orange clair, dismissable)
2. **Given** une seance individuelle contribue a l'ACWR eleve **When** sa carte est affichee **Then** un petit badge ⚡ est visible
3. **Given** le toggle "donnees techniques" est active **When** la banniere ACWR est affichee **Then** la valeur numerique ACWR est indiquee (ex: "ACWR : 1.42")
4. **Given** le toggle est active **When** le resume hebdomadaire est affiche **Then** TSB et ACWR sont visibles
5. **Given** le toggle est active **When** le bandeau objectif est affiche **Then** le code de phase (FI/EQ/TQ/FQ) et le VDOT sont visibles
6. **Given** le toggle est desactive (defaut) **When** la page est consultee **Then** les donnees techniques sont masquees

## Tasks / Subtasks

- [ ] Task 1 : Composant AcwrWarningBanner (AC: #1, #3)
  - [ ] Creer `inertia/components/planning/AcwrWarningBanner.tsx`
  - [ ] Ton bienveillant : "Ton corps a besoin de recup" — pas "DANGER"
  - [ ] Fond orange tres clair, dismissable
  - [ ] Mode technique : affiche valeur ACWR
- [ ] Task 2 : Badge ACWR sur carte seance (AC: #2)
  - [ ] Modifier `PlannedSessionCard` pour afficher badge ⚡ si ACWR > 1.3
- [ ] Task 3 : Toggle donnees techniques (AC: #4, #5, #6)
  - [ ] Toggle stocke en localStorage
  - [ ] Conditionner l'affichage des infos avancees dans GoalBanner, WeekSummary, PlannedSessionCard
- [ ] Task 4 : Calcul ACWR cote serveur (AC: #1)
  - [ ] Le use case GetPlanOverview inclut le FitnessProfile dans les props si plan actif

## Dev Notes

### Warning purement informatif

Le warning ne bloque rien. Le coureur decide. Coherent avec le principe "le plan propose, l'utilisateur dispose".

### References

- [UX Design sections 2.6, 2.7](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md)
- [PRD FR29](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
