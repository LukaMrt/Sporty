# Story 11.4 : Formulaire de saisie enrichi

Status: pending

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

- [ ] Task 1 : Backend — validation (AC: #1, #2, #3)
  - [ ] Etendre le validator de seance pour accepter les nouveaux champs optionnels
  - [ ] `minHeartRate` : entier, 30-250, optionnel
  - [ ] `maxHeartRate` : entier, 30-250, optionnel
  - [ ] `cadenceAvg` : entier, 50-250, optionnel
  - [ ] `elevationGain` : entier, 0-10000, optionnel
  - [ ] `elevationLoss` : entier, 0-10000, optionnel
- [ ] Task 2 : Backend — use case (AC: #2, #4)
  - [ ] Etendre le use case de creation/modification pour merger les nouvelles valeurs dans `sportMetrics` au format `RunMetrics`
  - [ ] Si FC max profil disponible + FC min/moy/max seance : calculer `hrZones` (delegation au service de calcul, Story 11.7)
- [ ] Task 3 : Frontend — champs formulaire (AC: #1, #3)
  - [ ] Ajouter les 5 champs dans la section "Plus de details" du `SessionForm`
  - [ ] Champs visibles uniquement pour le sport "course a pied"
  - [ ] Labels avec unites : "FC min (bpm)", "Denivele + (m)", etc.
  - [ ] Pre-remplissage en mode edition depuis `sportMetrics`

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
