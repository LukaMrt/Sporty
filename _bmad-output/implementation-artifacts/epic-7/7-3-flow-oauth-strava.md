# Story 7.3 : Flow OAuth Strava (authorize + callback)

Status: review

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

- [x] Task 1 : Route et controller authorize (AC: #1)
  - [x] Route `GET /connectors/strava/authorize`
  - [x] Generer un `state` aleatoire, stocker en session
  - [x] Rediriger vers Strava OAuth URL avec les bons parametres
- [x] Task 2 : Route et controller callback (AC: #2, #3)
  - [x] Route `GET /connectors/strava/callback`
  - [x] Verifier le parametre `state` (CSRF)
  - [x] Echanger le code via `POST https://www.strava.com/oauth/token`
  - [x] Chiffrer et persister les tokens via le modele Connector
  - [x] Rediriger vers `/connectors` avec flash message
- [x] Task 3 : Use case ConnectStrava (AC: #2, #5)
  - [x] Creer/mettre a jour le connecteur (upsert via contrainte unique)
  - [x] Stocker tokens chiffres, status `connected`
- [x] Task 4 : Activation conditionnelle (AC: #4)
  - [x] Variables env STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET dans `start/env.ts`
  - [x] Transmettre `stravaConfigured: boolean` via props Inertia
- [x] Task 5 : Validation et tests
  - [x] Test fonctionnel du flow complet (mock Strava API)

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

## Dev Agent Record

### Implementation Notes

- `ConnectorRepository` (abstract class dans `app/domain/interfaces/`) : port domain avec methode `upsert()`
- `LucidConnectorRepository` : implémentation Lucid via `updateOrCreate` sur contrainte unique `(user_id, provider)`
- `ConnectStrava` (use case) : orchestre l'upsert, injecte `ConnectorRepository` via `@inject()`
- `StravaConnectorController` : authorize génère state via `crypto.randomBytes(32)`, callback vérifie state + échange code via `fetch()` natif Node.js
- `ConnectorsController` : index transmet `stravaConfigured` selon présence des env vars
- Token exchange dans le controller (pas le use case) : c'est un concern HTTP/OAuth, le use case ne gère que la persistance
- `APP_URL` optionnel avec fallback `http://HOST:PORT` pour le redirect_uri

### Completion Notes

- Tous les ACs couverts par 7 tests fonctionnels (CI verte)
- Mock `global.fetch` dans les tests pour simuler la réponse Strava sans appel réseau réel
- State injecté via `.withSession()` dans les tests callback pour isolation totale

### Change Log

- 2026-03-08 : Implémentation complète story 7.3 — OAuth Strava authorize + callback, use case ConnectStrava, page Connecteurs

## File List

- `app/domain/interfaces/connector_repository.ts` (nouveau)
- `app/repositories/lucid_connector_repository.ts` (nouveau)
- `app/use_cases/connectors/connect_strava.ts` (nouveau)
- `app/controllers/connectors/strava_connector_controller.ts` (nouveau)
- `app/controllers/connectors/connectors_controller.ts` (nouveau)
- `inertia/pages/Connectors/Index.tsx` (nouveau)
- `tests/functional/connectors/strava_oauth.spec.ts` (nouveau)
- `start/env.ts` (modifié — ajout APP_URL, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET)
- `start/routes.ts` (modifié — ajout routes /connectors)
- `providers/app_provider.ts` (modifié — binding ConnectorRepository)
- `.env` (modifié — ajout variables Strava)
