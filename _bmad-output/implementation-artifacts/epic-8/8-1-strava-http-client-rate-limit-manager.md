# Story 8.1 : StravaHttpClient & RateLimitManager

Status: draft

## Story

As a **dev (Luka)**,
I want **un client HTTP Strava avec gestion du rate limiting**,
so that **tous les appels API Strava passent par un wrapper fiable qui respecte les limites** (NFR5, NFR6, NFR7, NFR8).

## Acceptance Criteria

1. **Given** le `StravaHttpClient` dans `app/connectors/strava/strava_http_client.ts` **When** il effectue un appel API **Then** il utilise `fetch` natif avec le bearer token et lit les headers `X-RateLimit-Usage` apres chaque reponse
2. **Given** l'API retourne HTTP 429 **When** le client intercepte **Then** il applique un backoff exponentiel avec jitter : 1s, 2s, 4s, 8s + random 0-500ms
3. **Given** l'API retourne HTTP 500 ou 503 **When** le client intercepte **Then** il reessaie avec backoff, max 3 tentatives
4. **Given** l'API retourne HTTP 401 **When** le client intercepte **Then** il delegue au mecanisme de refresh token (Story 7.5)
5. **Given** le `RateLimitManager` dans `app/connectors/rate_limit_manager.ts` **When** il est enregistre comme singleton IoC **Then** il verifie le budget restant avant chaque requete et attend le prochain reset si epuise
6. **Given** l'architecture **When** les use cases utilisent le client **Then** injection via IoC container, jamais d'import direct

## Tasks / Subtasks

- [ ] Task 1 : StravaHttpClient (AC: #1)
  - [ ] Creer `app/connectors/strava/strava_http_client.ts`
  - [ ] Wrapper fetch natif avec bearer token
  - [ ] Parser les headers `X-RateLimit-Usage` (casse insensible)
  - [ ] Mettre a jour le RateLimitManager apres chaque reponse
- [ ] Task 2 : Retry logic (AC: #2, #3, #4)
  - [ ] Backoff exponentiel avec jitter pour 429
  - [ ] Retry max 3 pour 500/503
  - [ ] Delegation refresh token pour 401
- [ ] Task 3 : RateLimitManager (AC: #5)
  - [ ] Creer `app/connectors/rate_limit_manager.ts`
  - [ ] Tracking budget 15min (100 req) et journalier (1000 req)
  - [ ] Attente automatique si budget epuise
  - [ ] Enregistrement singleton dans IoC
- [ ] Task 4 : Binding IoC (AC: #6)
  - [ ] Enregistrer StravaHttpClient et RateLimitManager dans le container

## Dev Notes

### Headers Strava Rate Limit

```
X-RateLimit-Limit: 100,1000
X-RateLimit-Usage: 42,567
```

Format : `15min_usage,daily_usage`. Les intervalles 15min se resettent aux quarts d'heure naturels.

### Backoff avec jitter (NFR7)

```typescript
const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500
```

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.1]
- [Source: _bmad-output/planning-artifacts/technical-api-strava-research-2026-03-07.md]
