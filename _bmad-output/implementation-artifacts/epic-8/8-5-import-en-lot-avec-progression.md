# Story 8.5 : Import en lot avec progression

Status: review

## Story

As a **utilisateur connecte**,
I want **selectionner plusieurs seances et les importer en lot avec un compteur de progression**,
so that **j'importe efficacement mes seances et je suis la progression** (FR11, FR12).

## Acceptance Criteria

1. **Given** j'ai des activites en statut `new` **When** je clique sur le bouton "Importer" d'une ligne **Then** l'import de cette activite demarre (UX simplifiee : bouton par ligne au lieu de checkboxes)
2. **Given** je clique "Importer" **When** l'import demarre **Then** le backend traite : GET /activities/{id}, mapping via StravaActivityMapper, insert session, statut passe a `imported`
3. **Given** l'import est en cours **When** je reste sur la page **Then** le bouton affiche "Importation…" via polling `GET /import/progress` toutes les 1.5 secondes
4. **Given** une activite echoue **When** l'erreur est detectee **Then** elle reste en `new`, message d'erreur affiche via toast
5. **Given** l'import est termine **When** le dernier element est traite **Then** le tableau se rafraichit avec les badges mis a jour et un toast confirme

## Tasks / Subtasks

- [x] Task 1 : Bouton d'import par ligne frontend (AC: #1)
  - [x] Bouton "Importer" sur chaque ligne de statut `new`
  - [x] Etat "Importation…" pendant le traitement (largeur fixe pour eviter le redimensionnement)
- [x] Task 2 : Use case ImportActivities (AC: #2, #4)
  - [x] Import sequentiel avec isolation par activite (try/catch individuel)
  - [x] Appel GET /activities/{id} pour DetailedActivity (implemente dans StravaConnector)
  - [x] Mapping via StravaDetailedActivityMapper (abstraction ActivityMapper en domain)
  - [x] Insert session + update import_activity status via setImported()
  - [x] Continue en cas d'erreur sur une activite, details stockes dans errors[]
- [x] Task 3 : Progression en memoire serveur (AC: #3)
  - [x] ImportProgressStore (singleton) : Map<userId, ImportProgress> avec errors[]
  - [x] ImportProgressPort (abstract class domain) pour respecter l'architecture en couches
  - [x] Route `GET /import/progress` pour polling frontend
- [x] Task 4 : Route et controller import (AC: #2)
  - [x] Route `POST /import/batch`
  - [x] Accepter un tableau d'import_activity_ids (validation vine)
  - [x] Fire-and-forget avec 202 immediat
- [x] Task 5 : Feedback frontend (AC: #3, #5)
  - [x] Polling progression toutes les 1.5 secondes
  - [x] Bouton en etat "Importation…" pendant le traitement
  - [x] Rafraichissement tableau via router.reload({ only: ['activities'] }) a la fin
  - [x] Toast de confirmation via systeme FlashMessages existant (pushToast)

## Dev Notes

### Import atomique

Chaque activite est importee dans son propre try/catch. Si une echoue, elle n'affecte pas les autres. La progression et les erreurs sont stockees dans ImportProgressStore.

### Progression en memoire

Pas besoin de Redis ou de WebSocket pour le MVP. Un simple Map en memoire avec polling HTTP suffit. Le frontend poll `GET /import/progress` et recoit `{ total, completed, failed, errors }`.

### Slugs sports

Les slugs retournes par StravaSportMapper utilisent l'anglais (`running`, `cycling`, etc.) pour correspondre aux slugs en base de donnees. Le seeder contient uniquement `running` pour le MVP.

### Architecture couches

- `ImportProgressPort` : abstract class dans `#domain/interfaces/` (injecte dans use case et controller)
- `ImportProgressStore` : implementation concrete dans `#services/` (binding singleton AppProvider)
- `ActivityMapper` : abstract class dans `#domain/interfaces/` (injecte dans use case)
- `StravaDetailedActivityMapper` : implementation dans `#connectors/strava/`

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.5]

## Dev Agent Record

### Implementation Plan

Story implementee en suivant l'architecture clean (dependency-cruiser enforced) :
- Use case injecte uniquement des abstractions domain
- Controller injecte use case + port domain
- Bindings concrets dans AppProvider

### Completion Notes

- AC#1 : UX simplifiee en bouton par ligne (meilleure UX que checkboxes selon feedback utilisateur)
- AC#2 : getActivityDetail implemente dans StravaConnector, slugs alignes avec la DB (anglais)
- AC#3 : polling 1.5s, details d'erreur exposes dans errors[] pour debug
- AC#4 : erreurs silencieuses par activite, details dans progress.errors
- AC#5 : toast via pushToast() branché sur FlashMessages existant

### Change Log

- feat: Story 8.5 — import par ligne avec progression et toast (2026-03-08)

## File List

- app/connectors/strava/strava_connector.ts (modifie — getActivityDetail implemente)
- app/connectors/strava/strava_sport_mapper.ts (modifie — slugs anglais)
- app/connectors/strava/strava_activity_mapper.ts (modifie — Math.round durationMinutes, CYCLING_SLUGS)
- app/connectors/strava/strava_detailed_activity_mapper.ts (nouveau)
- app/domain/entities/training_session.ts (modifie — importedFrom, externalId optionnels)
- app/domain/interfaces/import_activity_repository.ts (modifie — findByIds, setImported)
- app/domain/interfaces/import_progress_port.ts (nouveau)
- app/domain/interfaces/activity_mapper.ts (nouveau)
- app/repositories/lucid_import_activity_repository.ts (modifie — findByIds, setImported)
- app/repositories/lucid_session_repository.ts (modifie — importedFrom, externalId, Math.round)
- app/services/import_progress_store.ts (nouveau)
- app/use_cases/import/import_activities.ts (nouveau)
- app/controllers/import/import_controller.ts (nouveau)
- start/routes.ts (modifie — POST /import/batch, GET /import/progress)
- providers/app_provider.ts (modifie — bindings ImportProgressPort, ActivityMapper)
- inertia/components/import/ActivitiesDataTable.tsx (modifie — bouton par ligne, polling, toast)
- inertia/components/shared/FlashMessages.tsx (modifie — registerToastHandler)
- inertia/hooks/use_toast.ts (nouveau)
- resources/lang/fr/import.json (modifie)
- resources/lang/en/import.json (modifie)
- tests/unit/use_cases/import/import_activities.spec.ts (nouveau)
- tests/unit/connectors/strava/strava_sport_mapper.spec.ts (modifie — slugs anglais)
- tests/unit/connectors/strava/strava_activity_mapper.spec.ts (modifie — slugs anglais, Math.round)
- tests/unit/use_cases/import/list_pre_import_activities.spec.ts (modifie — nouveaux mocks)
