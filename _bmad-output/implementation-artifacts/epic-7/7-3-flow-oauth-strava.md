# Story 7.3 : Flow OAuth Strava (authorize + callback)

Status: draft

## Story

As a **utilisateur connecte**,
I want **connecter mon compte Strava via OAuth2**,
so that **Sporty peut acceder a mes activites Strava** (FR1).

## Acceptance Criteria

1. **Given** les credentials Strava sont configures en env (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET) **And** je suis sur la page Connecteurs **When** je clique "Connecter Strava" **Then** je suis redirige vers `https://www.strava.com/oauth/authorize` avec client_id, redirect_uri (depuis APP_URL), response_type=code, scope=read,activity:read_all **And** un parametre `state` aleatoire est stocke en session
2. **Given** j'autorise l'acces sur Strava **When** Strava redirige vers `/connectors/strava/callback` **Then** le `state` est verifie, le code est echange via POST pour access_token + refresh_token, les tokens sont chiffres et persistes avec status `connected`, je suis redirige vers `/connectors` avec un toast
3. **Given** le parametre `state` ne correspond pas **When** le callback est traite **Then** une erreur est affichee et aucun token n'est stocke
4. **Given** les credentials Strava ne sont PAS configures en env **When** je suis sur la page Connecteurs **Then** le bouton "Connecter Strava" n'apparait pas
5. **Given** j'ai deja un connecteur Strava actif **When** je tente de connecter a nouveau **Then** l'ancien connecteur est mis a jour avec les nouveaux tokens

## Tasks / Subtasks

- [ ] Task 1 : Route et controller authorize (AC: #1)
  - [ ] Route `GET /connectors/strava/authorize`
  - [ ] Generer un `state` aleatoire, stocker en session
  - [ ] Rediriger vers Strava OAuth URL avec les bons parametres
- [ ] Task 2 : Route et controller callback (AC: #2, #3)
  - [ ] Route `GET /connectors/strava/callback`
  - [ ] Verifier le parametre `state` (CSRF)
  - [ ] Echanger le code via `POST https://www.strava.com/oauth/token`
  - [ ] Chiffrer et persister les tokens via le modele Connector
  - [ ] Rediriger vers `/connectors` avec flash message
- [ ] Task 3 : Use case ConnectStrava (AC: #2, #5)
  - [ ] Creer/mettre a jour le connecteur (upsert via contrainte unique)
  - [ ] Stocker tokens chiffres, status `connected`
- [ ] Task 4 : Activation conditionnelle (AC: #4)
  - [ ] Variables env STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET dans `start/env.ts`
  - [ ] Transmettre `stravaConfigured: boolean` via props Inertia
- [ ] Task 5 : Validation et tests
  - [ ] Test fonctionnel du flow complet (mock Strava API)

## Dev Notes

### OAuth Flow

1. Frontend clique "Connecter" → `GET /connectors/strava/authorize`
2. Backend genere `state`, redirige vers Strava
3. Utilisateur autorise sur Strava
4. Strava redirige vers `GET /connectors/strava/callback?code=xxx&state=yyy`
5. Backend verifie state, echange code contre tokens
6. Tokens chiffres, connecteur cree/mis a jour, redirect `/connectors`

### redirect_uri

Construit depuis `APP_URL` env variable : `${APP_URL}/connectors/strava/callback`
Compatible reverse proxy (pas de detection automatique de host).

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.3]
- [Source: _bmad-output/planning-artifacts/technical-api-strava-research-2026-03-07.md]
