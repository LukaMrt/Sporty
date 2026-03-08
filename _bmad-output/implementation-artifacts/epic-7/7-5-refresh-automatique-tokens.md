# Story 7.5 : Refresh automatique des tokens

Status: review

## Story

As a **systeme**,
I want **rafraichir automatiquement les tokens OAuth expires**,
so that **la connexion Strava reste fonctionnelle sans intervention utilisateur** (FR5, FR6).

## Acceptance Criteria

1. **Given** un appel API Strava retourne HTTP 401 **When** le `StravaHttpClient` intercepte la reponse **Then** il tente un refresh via `POST https://www.strava.com/oauth/token` avec grant_type=refresh_token
2. **Given** le refresh reussit **When** les tokens sont mis a jour **Then** le nouveau refresh_token est persiste en base AVANT de continuer (persist-before-use) **And** le connecteur reste en etat `connected` **And** l'appel original est reexecute avec le nouveau access_token
3. **Given** le refresh echoue (token revoque, erreur reseau) **When** la tentative echoue **Then** le connecteur passe en etat `error` **And** aucun appel API supplementaire n'est tente
4. **Given** le token_expires_at est dans le passe **When** un nouvel appel API est initie **Then** le refresh est tente proactivement avant l'appel

## Tasks / Subtasks

- [x] Task 1 : Mecanisme de refresh dans StravaHttpClient (AC: #1, #2)
  - [x] Intercepter HTTP 401
  - [x] Appel `POST /oauth/token` avec refresh_token
  - [x] Persist-before-use : sauvegarder le nouveau refresh_token avant de reexecuter l'appel
- [x] Task 2 : Refresh proactif (AC: #4)
  - [x] Verifier `token_expires_at` avant chaque appel
  - [x] Si expire, refresh avant l'appel (evite un aller-retour 401)
- [x] Task 3 : Gestion des echecs de refresh (AC: #3)
  - [x] Passer le connecteur en etat `error`
  - [x] Stopper les appels API

## Dev Notes

### Persist-before-use (FR6)

C'est un pattern critique : le nouveau refresh_token doit etre sauvegarde en base AVANT que la reponse API ne soit traitee. Si le processus crash entre la reception du nouveau token et son utilisation, on ne perd pas le refresh_token.

### Sequence refresh

1. Appel API → 401
2. POST /oauth/token (grant_type=refresh_token)
3. Recevoir nouveau access_token + refresh_token
4. Persister en base (transaction)
5. Reexecuter l'appel original avec le nouveau access_token

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.5]

## Dev Agent Record

### Implementation Plan

- `ConnectorRepository` (domain port) étendu avec `updateTokens` + `setStatus`
- `LucidConnectorRepository` implémente les deux méthodes (save() pour déclencher les hooks @column.prepare de chiffrement)
- `StravaHttpClient` (app/services/strava/) : service infra avec fetcher injectable pour tests

### Completion Notes

- AC#1 : 401 intercepté dans `get()` → `doRefresh()` → retry
- AC#2 : `updateTokens()` appelé avant mise à jour in-memory (persist-before-use vérifié par test d'ordre)
- AC#3 : `setStatus(error)` + throw `ConnectorAuthError` — aucun retry supplémentaire
- AC#4 : `isExpired()` vérifié en début de `get()` → refresh proactif si `expiresAt <= now`
- 6 tests unitaires, tous verts

## File List

- `app/domain/interfaces/connector_repository.ts` — ajout `UpdateTokensInput`, `updateTokens`, `setStatus`
- `app/repositories/lucid_connector_repository.ts` — implémentation `updateTokens`, `setStatus`
- `app/services/strava/strava_http_client.ts` — nouveau fichier
- `tests/unit/services/strava/strava_http_client.spec.ts` — nouveau fichier (6 tests)

## Change Log

- 2026-03-08 : Implémentation story 7.5 — StravaHttpClient avec refresh automatique (AC#1-4)
