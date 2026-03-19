# Story 11.4 : Formulaire de saisie enrichi

Status: done

## Story

As a **utilisateur connecte**,
I want **saisir des metriques de course supplementaires lors de la creation ou modification d'une seance**,
so that **mon historique est plus complet meme sans fichier GPX**.

## Acceptance Criteria

1. **Given** je cree ou modifie une seance de course **When** je deplie "Plus de details" **Then** je vois les nouveaux champs : FC min (bpm), FC max (bpm), Cadence moyenne (pas/min), Denivele + (m), Denivele - (m)
2. **Given** je remplis ces champs et je sauvegarde **When** la requete est traitee **Then** les valeurs sont stockees dans `sportMetrics` au format `RunMetrics`
3. **Given** les anciens champs (`avgHeartRate`, `perceivedEffort`, etc.) **When** je saisis une seance **Then** ils continuent de fonctionner normalement
4. **Given** j'ai renseigne ma FC max dans mon profil ET je saisis FC min/moy/max pour une seance **When** la seance est sauvegardee **Then** les zones FC sont calculees automatiquement et stockees dans `sportMetrics.hrZones`

## Tasks / Subtasks

- [x] Task 1 : Backend — validation (AC: #1, #2, #3)
  - [x] Etendre le validator de seance pour accepter les nouveaux champs optionnels
  - [x] `minHeartRate` : entier, 30-250, optionnel
  - [x] `maxHeartRate` : entier, 30-250, optionnel
  - [x] `cadenceAvg` : entier, 50-250, optionnel
  - [x] `elevationGain` : entier, 0-10000, optionnel
  - [x] `elevationLoss` : entier, 0-10000, optionnel
- [x] Task 2 : Backend — use case (AC: #2, #4)
  - [x] Etendre le use case de creation/modification pour merger les nouvelles valeurs dans `sportMetrics` au format `RunMetrics`
  - [x] Si FC max profil disponible + FC min/moy/max seance : calculer `hrZones` (delegation au service de calcul, Story 11.7) — reporté à Story 11.7 conformément aux Dev Notes
- [x] Task 3 : Frontend — champs formulaire (AC: #1, #3)
  - [x] Ajouter les 5 champs dans la section "Plus de details" du `SessionForm`
  - [x] Champs visibles uniquement pour le sport "course a pied"
  - [x] Labels avec unites : "FC min (bpm)", "Denivele + (m)", etc.
  - [x] Pre-remplissage en mode edition depuis `sportMetrics`

## Dev Notes

### Champs conditionnels par sport

Les champs enrichis ne s'affichent que pour la course a pied. Pour les autres sports, la section "Plus de details" reste inchangee. Cela prepare l'extensibilite future (velo : puissance, cadence RPM).

### Calcul zones FC

Le calcul des zones FC (AC #4) sera delegue a un service domain cree en Story 11.7. En attendant, stocker les valeurs brutes dans `sportMetrics` suffit — les zones seront calculees et ajoutees retroactivement.

### Dependances

- Story 11.3 (schema `RunMetrics` + migrations)

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.4]
- Formulaire existant : `inertia/components/forms/SessionForm.tsx` (ou equivalent)
- Validator existant : `app/validators/sessions/`

## Dev Agent Record

### Implementation Plan

1. Validators create + update étendus avec 5 champs optionnels (validation explicite)
2. Use cases CreateSession + UpdateSession : merge des RunMetrics dans sportMetrics
3. Controller sessions : passage des nouveaux champs du validator au use case
4. SessionForm.tsx : 5 champs conditionnels (slug 'running'), pré-remplissage depuis sportMetrics
5. Edit.tsx : ajout de sportMetrics dans l'interface et le passage au formulaire
6. Traductions fr + en ajoutées

### Completion Notes

- AC #1 : 5 champs dans "Plus de détails", visibles uniquement pour sport slug='running'
- AC #2 : valeurs mergées dans sportMetrics via RunMetrics dans les use cases (spread)
- AC #3 : anciens champs (avgHeartRate, perceivedEffort, etc.) inchangés
- AC #4 : reporté à Story 11.7 conformément aux Dev Notes ("stocker les valeurs brutes suffit")
- Tests unitaires : create_session.spec.ts (+3 tests merge RunMetrics), update_session.spec.ts (+1 test)
- Tests fonctionnels : create_session.spec.ts (+1 test stockage sport_metrics)

## File List

- `app/validators/sessions/create_session_validator.ts`
- `app/validators/sessions/update_session_validator.ts`
- `app/use_cases/sessions/create_session.ts`
- `app/use_cases/sessions/update_session.ts`
- `app/controllers/sessions/sessions_controller.ts`
- `inertia/components/sessions/SessionForm.tsx`
- `inertia/pages/Sessions/Edit.tsx`
- `resources/lang/fr/sessions.json`
- `resources/lang/en/sessions.json`
- `tests/unit/use_cases/sessions/create_session.spec.ts`
- `tests/unit/use_cases/sessions/update_session.spec.ts`
- `tests/functional/sessions/create_session.spec.ts`

## Change Log

- Story 11.4 implémentée — formulaire enrichi avec 5 métriques course à pied, merge dans RunMetrics (2026-03-17)
