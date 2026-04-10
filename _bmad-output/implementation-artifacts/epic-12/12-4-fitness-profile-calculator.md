# Story 12.4 : FitnessProfileCalculator — CTL/ATL/TSB/ACWR

Status: done

## Story

As a **dev (Luka)**,
I want **un calculateur de profil fitness base sur le modele Banister (CTL/ATL/TSB/ACWR)**,
So that **le systeme connait l'etat de forme du coureur pour generer et recalibrer les plans**.

## Acceptance Criteria

1. **Given** un historique de charge trie par date **When** `calculate()` est appele **Then** CTL (τ=42j), ATL (τ=7j), TSB et ACWR sont retournes
2. **Given** un historique vide **When** `calculate()` est appele **Then** toutes les valeurs sont a 0
3. **Given** un historique de 60+ jours **When** le calcul est effectue **Then** le resultat est retourne en < 200ms
4. **Given** les memes donnees d'entree **When** le calcul est repete **Then** le resultat est identique (deterministe, pas de cache)
5. **Given** un CTL > 0 **When** ACWR est calcule **Then** ACWR = ATL / CTL

## Tasks / Subtasks

- [x] Task 1 : Value object FitnessProfile (AC: prerequis)
  - [x] Creer `app/domain/value_objects/fitness_profile.ts`
  - [x] `{ chronicTrainingLoad, acuteTrainingLoad, trainingStressBalance, acuteChronicWorkloadRatio, calculatedAt }`
- [x] Task 2 : Port abstrait (AC: prerequis)
  - [x] Creer `app/domain/interfaces/fitness_profile_calculator.ts`
  - [x] `abstract calculate(loadHistory: { date: string; load: TrainingLoad }[]): FitnessProfile`
- [x] Task 3 : Implementation Banister (AC: #1, #2, #5)
  - [x] Creer `app/services/training/banister_fitness_calculator.ts`
  - [x] Iteration jour par jour, EMA avec τ₁=42 (CTL) et τ₂=7 (ATL)
  - [x] TSB = CTL - ATL
  - [x] ACWR = ATL / CTL (guard division par zero)
- [x] Task 4 : Binding IoC
  - [x] Ajouter binding `FitnessProfileCalculator` → `BanisterFitnessCalculator` dans `providers/app_provider.ts`
- [x] Task 5 : Tests unitaires (AC: #1-#5)
  - [x] Test avec historique connu → valeurs attendues
  - [x] Test historique vide → zeros
  - [x] Test determinisme
  - [x] Test ACWR avec CTL = 0 → pas de division par zero

## Dev Notes

### Formules

```
CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / 42
ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / 7
TSB(t) = CTL(t) - ATL(t)
ACWR = ATL / CTL
```

### Jamais stocke

CTL/ATL/TSB ne sont jamais persistes en BDD — toujours recalcules a la demande. Cela garantit la coherence si des seances sont reimportees, supprimees ou modifiees.

### Constantes V1

τ₁=42 et τ₂=7 sont les valeurs standard de la litterature. Le fitting individuel est hors scope V1.

### References

- [Architecture section 9.2](/_bmad-output/planning-artifacts/planning-module/architecture-planning-module.md#9)
- Banister et al. (1975), Banister (1991)

## Dev Agent Record

### Implementation Plan

1. Value object `FitnessProfile` (interface TypeScript) dans le domain
2. Port abstrait `FitnessProfileCalculator` (abstract class) pour la compatibilite IoC AdonisJS
3. `BanisterFitnessCalculator` : EMA iterative jour par jour, tri interne des données
4. Binding IoC dans `app_provider.ts` (pattern identique a `TrainingLoadCalculator`)
5. Tests unitaires couvrant tous les ACs

### Completion Notes

- ✅ Value object `FitnessProfile` créé avec tous les champs requis + `calculatedAt: Date`
- ✅ Port `FitnessProfileCalculator` (abstract class) créé — conforme aux conventions du projet
- ✅ `BanisterFitnessCalculator` : EMA Banister pure, tri chronologique interne, guard ACWR/0
- ✅ Binding IoC ajouté dans `providers/app_provider.ts`
- ✅ 9 tests unitaires couvrant : historique vide, valeurs numériques, TSB, ACWR, déterminisme, tri interne, performance 365j < 200ms

## File List

- `app/domain/value_objects/fitness_profile.ts` (créé)
- `app/domain/interfaces/fitness_profile_calculator.ts` (créé)
- `app/services/training/banister_fitness_calculator.ts` (créé)
- `providers/app_provider.ts` (modifié — ajout import + binding)
- `tests/unit/services/training/banister_fitness_calculator.spec.ts` (créé)

## Change Log

- 2026-03-23 : Implémentation complète Story 12.4 — FitnessProfileCalculator (CTL/ATL/TSB/ACWR)
