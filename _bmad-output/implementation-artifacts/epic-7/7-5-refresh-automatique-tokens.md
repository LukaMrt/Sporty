# Story 7.5 : Refresh automatique des tokens

Status: draft

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

- [ ] Task 1 : Mecanisme de refresh dans StravaHttpClient (AC: #1, #2)
  - [ ] Intercepter HTTP 401
  - [ ] Appel `POST /oauth/token` avec refresh_token
  - [ ] Persist-before-use : sauvegarder le nouveau refresh_token avant de reexecuter l'appel
- [ ] Task 2 : Refresh proactif (AC: #4)
  - [ ] Verifier `token_expires_at` avant chaque appel
  - [ ] Si expire, refresh avant l'appel (evite un aller-retour 401)
- [ ] Task 3 : Gestion des echecs de refresh (AC: #3)
  - [ ] Passer le connecteur en etat `error`
  - [ ] Stopper les appels API

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
