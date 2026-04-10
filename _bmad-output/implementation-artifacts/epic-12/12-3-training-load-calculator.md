# Story 12.3 : TrainingLoadCalculator — Calcul de charge normalise

Status: done

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

- [x] Task 1 : Value objects (AC: prerequis)
  - [x] Creer `app/domain/value_objects/training_load.ts` — `{ value, method }`
  - [x] Creer `app/domain/value_objects/session_load_input.ts` — DTO d'entree complet
- [x] Task 2 : Port abstrait (AC: prerequis)
  - [x] Creer `app/domain/interfaces/training_load_calculator.ts` — abstract class avec `calculate(input): TrainingLoad`
- [x] Task 3 : Implementation cascade (AC: #1, #2, #3, #4, #5, #6)
  - [x] Creer `app/services/training/training_load_calculator_impl.ts`
  - [x] Branche 1 : TRIMPexp (heartRateCurve + maxHR + restHR) → normaliser en hrTSS
  - [x] Branche 2 : rTSS (splits ou distance/duree + VDOT → IF² × duree)
  - [x] Branche 3 : Session RPE (perceivedEffort × duree / coeff normalisation)
  - [x] Branche 4 : fallback `{ value: 0, method: 'rpe' }`
- [x] Task 4 : Binding IoC
  - [x] Ajouter binding `TrainingLoadCalculator` → `TrainingLoadCalculatorImpl` dans `providers/app_provider.ts`
- [x] Task 5 : Tests unitaires (AC: #1-#6)
  - [x] Test cascade : seance avec toutes les donnees → TRIMPexp utilise
  - [x] Test cascade : seance sans FC mais avec allure → rTSS utilise
  - [x] Test cascade : seance avec RPE seul → RPE utilise
  - [x] Test coefficient k homme vs femme
  - [x] Test normalisation TSS-like

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

## Dev Agent Record

### Implementation Plan

- Value objects `TrainingLoad` et `SessionLoadInput` dans le domaine pur (zéro dépendances)
- Port abstrait `TrainingLoadCalculator` (abstract class, convention du projet)
- Implémentation `TrainingLoadCalculatorImpl` avec cascade de priorité : TRIMPexp > rTSS > RPE > fallback
- TRIMPexp : intégration numérique sur la courbe FC, normalisée par référence 1h à LTHR (88% FCmax)
- rTSS : résolution quadratique de l'allure seuil depuis VDOT, puis IF² × durée × 100
- RPE : effort × durée_min / 4.2 (calibré pour RPE 7 / 1h = 100 TSS)
- Binding IoC dans `providers/app_provider.ts`

### Completion Notes

Tous les ACs couverts. 18 tests unitaires répartis sur 6 groupes : cascade de méthode, hrTSS normalisation, coefficient k homme/femme, rTSS, Session RPE, normalisation TSS-like.

## File List

- `app/domain/value_objects/training_load.ts` (nouveau)
- `app/domain/value_objects/session_load_input.ts` (nouveau)
- `app/domain/interfaces/training_load_calculator.ts` (nouveau)
- `app/services/training/training_load_calculator_impl.ts` (nouveau)
- `providers/app_provider.ts` (modifié — binding IoC)
- `tests/unit/services/training/training_load_calculator_impl.spec.ts` (nouveau)

## Change Log

- 2026-03-23 : Implémentation complète — value objects, port, service cascade TRIMPexp/rTSS/RPE, binding IoC, 18 tests unitaires
