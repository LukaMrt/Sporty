# Story 12.4 : FitnessProfileCalculator — CTL/ATL/TSB/ACWR

Status: pending

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

- [ ] Task 1 : Value object FitnessProfile (AC: prerequis)
  - [ ] Creer `app/domain/value_objects/fitness_profile.ts`
  - [ ] `{ chronicTrainingLoad, acuteTrainingLoad, trainingStressBalance, acuteChronicWorkloadRatio, calculatedAt }`
- [ ] Task 2 : Port abstrait (AC: prerequis)
  - [ ] Creer `app/domain/interfaces/fitness_profile_calculator.ts`
  - [ ] `abstract calculate(loadHistory: { date: string; load: TrainingLoad }[]): FitnessProfile`
- [ ] Task 3 : Implementation Banister (AC: #1, #2, #5)
  - [ ] Creer `app/services/training/banister_fitness_calculator.ts`
  - [ ] Iteration jour par jour, EMA avec τ₁=42 (CTL) et τ₂=7 (ATL)
  - [ ] TSB = CTL - ATL
  - [ ] ACWR = ATL / CTL (guard division par zero)
- [ ] Task 4 : Binding IoC
  - [ ] Ajouter binding `FitnessProfileCalculator` → `BanisterFitnessCalculator` dans `providers/app_provider.ts`
- [ ] Task 5 : Tests unitaires (AC: #1-#5)
  - [ ] Test avec historique connu → valeurs attendues
  - [ ] Test historique vide → zeros
  - [ ] Test determinisme
  - [ ] Test ACWR avec CTL = 0 → pas de division par zero

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
