# Story 12.3 : TrainingLoadCalculator — Calcul de charge normalise

Status: pending

## Story

As a **dev (Luka)**,
I want **un calculateur de charge avec cascade TRIMPexp → rTSS → Session RPE**,
So that **chaque seance a une charge comparable quelle que soit la source de donnees**.

## Acceptance Criteria

1. **Given** une seance avec streams FC + FC max + FC repos **When** `calculate()` est appele **Then** la charge est calculee via TRIMPexp normalise en hrTSS, avec `method: 'trimp_exp'`
2. **Given** une seance avec allure + VDOT (sans streams FC) **When** `calculate()` est appele **Then** la charge est calculee via rTSS (IF² × duree), avec `method: 'rtss'`
3. **Given** une seance avec seulement RPE + duree **When** `calculate()` est appele **Then** la charge est calculee via Session RPE pondere, avec `method: 'rpe'`
4. **Given** une seance sans donnees exploitables **When** `calculate()` est appele **Then** `{ value: 0, method: 'rpe' }` est retourne
5. **Given** le coefficient k du TRIMPexp **When** le sexe est 'female' **Then** k = 1.67 (au lieu de 1.92 pour homme)
6. **Given** la charge normalisee **When** elle est retournee **Then** la valeur est en TSS-like (100 = 1h au seuil lactique)

## Tasks / Subtasks

- [ ] Task 1 : Value objects (AC: prerequis)
  - [ ] Creer `app/domain/value_objects/training_load.ts` — `{ value, method }`
  - [ ] Creer `app/domain/value_objects/session_load_input.ts` — DTO d'entree complet
- [ ] Task 2 : Port abstrait (AC: prerequis)
  - [ ] Creer `app/domain/interfaces/training_load_calculator.ts` — abstract class avec `calculate(input): TrainingLoad`
- [ ] Task 3 : Implementation cascade (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Creer `app/services/training/training_load_calculator_impl.ts`
  - [ ] Branche 1 : TRIMPexp (heartRateCurve + maxHR + restHR) → normaliser en hrTSS
  - [ ] Branche 2 : rTSS (splits ou distance/duree + VDOT → IF² × duree)
  - [ ] Branche 3 : Session RPE (perceivedEffort × duree / coeff normalisation)
  - [ ] Branche 4 : fallback `{ value: 0, method: 'rpe' }`
- [ ] Task 4 : Binding IoC
  - [ ] Ajouter binding `TrainingLoadCalculator` → `TrainingLoadCalculatorImpl` dans `providers/app_provider.ts`
- [ ] Task 5 : Tests unitaires (AC: #1-#6)
  - [ ] Test cascade : seance avec toutes les donnees → TRIMPexp utilise
  - [ ] Test cascade : seance sans FC mais avec allure → rTSS utilise
  - [ ] Test cascade : seance avec RPE seul → RPE utilise
  - [ ] Test coefficient k homme vs femme
  - [ ] Test normalisation TSS-like

## Dev Notes

### TRIMPexp (Banister, 1991)

```
TRIMPexp = Σ (Δt × HRr × 0.64 × e^(k × HRr))
HRr = (FC_exercice - FC_repos) / (FC_max - FC_repos)
k = 1.92 (homme) / 1.67 (femme)
```

### Normalisation TRIMPexp → hrTSS

```
TRIMPexp_1h_LTHR = reference 1h au seuil lactique
hrTSS = (TRIMPexp_seance / TRIMPexp_1h_LTHR) × 100
```

La FC au seuil lactique est estimee a ~88% de FC max (convention Daniels zone T).

### rTSS

```
IF = allure_seance / allure_seuil (en vitesse)
rTSS = IF² × duree_heures × 100
```

### Le TRIMP existant (Lucia) n'est PAS reutilisable

`sportMetrics.trimp` est un Lucia's TRIMP par zones, incompatible avec le modele Banister. Le TRIMPexp est calcule separement.

### References

- [Architecture section 9.3 & 9.4](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#9)
- [PRD section Formules cles](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
