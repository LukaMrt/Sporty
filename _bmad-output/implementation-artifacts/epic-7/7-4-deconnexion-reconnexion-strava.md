# Story 7.4 : Deconnexion & reconnexion Strava

Status: done

## Story

As a **utilisateur avec un connecteur Strava**,
I want **deconnecter Strava ou reconnecter en cas d'erreur**,
so that **j'ai le controle sur la connexion et je peux corriger les problemes** (FR2, FR3, FR4).

## Acceptance Criteria

1. **Given** mon connecteur est en etat `connected` **When** je suis sur la page Connecteurs **Then** je vois l'etat "Connecte" (badge vert), la date du dernier sync, et un bouton "Deconnecter"
2. **Given** je clique "Deconnecter" et confirme **When** la requete est traitee **Then** `POST https://www.strava.com/oauth/deauthorize` est envoye, les tokens sont supprimes, le connecteur passe en `disconnected`, un toast confirme
3. **Given** mon connecteur est en etat `error` **When** je suis sur la page Connecteurs **Then** je vois l'etat "Erreur" (badge orange) et un bouton "Reconnecter"
4. **Given** je clique "Reconnecter" **When** le flow OAuth se relance **Then** le meme flux que Story 7.3 est execute et le connecteur repasse en `connected`
5. **Given** la requete deauthorize echoue (Strava indisponible) **When** la deconnexion est traitee **Then** les tokens sont quand meme supprimes localement et le connecteur passe en `disconnected`

## Tasks / Subtasks

- [x] Task 1 : Use case DisconnectStrava (AC: #2, #5)
  - [x] Appel deauthorize Strava (best-effort, pas bloquant)
  - [x] Supprimer tokens, passer status a `disconnected`
- [x] Task 2 : Route et controller disconnect (AC: #2)
  - [x] Route `POST /connectors/strava/disconnect`
  - [x] Confirmation cote frontend avant envoi
- [x] Task 3 : Bouton Reconnecter (AC: #3, #4)
  - [x] Reutilise le flow authorize de Story 7.3
- [x] Task 4 : Affichage contextuel des etats (AC: #1, #3)
  - [x] Badge vert/orange/gris selon status
  - [x] Boutons contextuels

## Dev Notes

### Deauthorize best-effort

La deconnexion locale doit toujours reussir, meme si l'appel Strava echoue. On catch l'erreur et on continue.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.4]

## Dev Agent Record

### Implementation Plan

- `ConnectorRecord` étendu avec `accessToken: string | null` pour permettre l'appel deauthorize
- `ConnectorRepository` + `LucidConnectorRepository` : ajout méthode `disconnect(userId, provider)` — efface tokens, passe status en `disconnected`
- `DisconnectStrava` use case : best-effort deauthorize Strava, puis disconnect local inconditionnel
- `GetStravaConnector` : ajout méthode `getStatus()` retournant `ConnectorStatus | null`
- `ConnectorsController` : passe `stravaStatus` (au lieu de `stravaConnected: boolean`) à Inertia
- `StravaConnectorController` : ajout méthode `disconnect` injectant `DisconnectStrava`
- Route `POST /connectors/strava/disconnect` dans le groupe auth/onboarding
- `Index.tsx` : refactoré avec 3 états (connected → badge vert + bouton déconnecter, error → badge orange + bouton reconnecter, null → bouton connecter)
- Clés i18n ajoutées : `reconnect`, `disconnect`, `statusError`, `disconnected` (fr + en)

### Completion Notes

✅ Task 1 — DisconnectStrava use case : best-effort deauthorize + disconnect local
✅ Task 2 — Route POST /connectors/strava/disconnect + controller + confirmation window.confirm()
✅ Task 3 — Bouton Reconnecter réutilise /connectors/strava/authorize (flow 7.3)
✅ Task 4 — Badge vert/orange contextuel + boutons selon stravaStatus
✅ Tests fonctionnels : 5 cas couvrant AC#1 AC#2 AC#3 AC#5 + non-authentifié
✅ typecheck : 0 erreur | CI validée par l'utilisateur

## File List

- `app/domain/interfaces/connector_repository.ts` — ajout `accessToken` dans `ConnectorRecord`, ajout `disconnect()` dans abstract class
- `app/repositories/lucid_connector_repository.ts` — implémentation `disconnect()`, exposition `accessToken` dans `findByUserAndProvider`
- `app/use_cases/connectors/disconnect_strava.ts` — **nouveau**
- `app/use_cases/connectors/get_strava_connector.ts` — ajout `getStatus()`
- `app/controllers/connectors/connectors_controller.ts` — `stravaStatus` au lieu de `stravaConnected`
- `app/controllers/connectors/strava_connector_controller.ts` — injection `DisconnectStrava`, méthode `disconnect`
- `start/routes.ts` — route `POST /connectors/strava/disconnect`
- `inertia/pages/Connectors/Index.tsx` — refactoré : 3 états, badges, boutons contextuels
- `resources/lang/fr/connectors.json` — clés `reconnect`, `disconnect`, `statusError`, `disconnected`
- `resources/lang/en/connectors.json` — mêmes clés en anglais
- `tests/functional/connectors/strava_disconnect.spec.ts` — **nouveau** : 5 tests fonctionnels

## Change Log

- 2026-03-08 : Story 7.4 implémentée — déconnexion/reconnexion Strava (Amelia / claude-sonnet-4-6)
