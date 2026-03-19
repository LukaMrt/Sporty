# Story 11-refacto : Fusion Connecteur + Mapper — le connecteur retourne du MappedSessionData

Status: done

Prerequis: 11.11

## Contexte

Aujourd'hui le flux d'import separe le connecteur (I/O API) du mapper (transformation). En pratique, le mapper est intimement lie au connecteur : `StravaDetailedSessionMapper` reconstruit un `RawStravaDetailedSession` depuis le `SessionDetail` generique pour le re-passer au `StravaSessionMapper`. C'est un aller-retour inutile.

Le `ConnectorRegistry` enregistre factory + mapper + rateLimiter ensemble — ils sont deja couples. Chaque connecteur a son propre mapper, il n'y a pas de mapper generique reutilise entre connecteurs.

Cette story fusionne connecteur et mapper pour que le port `Connector` retourne directement des donnees dans le format domaine (`MappedSessionData`).

## Story

As a **developpeur**,
I want **que le connecteur retourne directement des `MappedSessionData` au lieu de `SessionDetail` bruts**,
so that **le domaine ne voit jamais les formats externes, chaque connecteur encapsule entierement sa transformation, et les use cases d'import sont ultra-minces sans duplication**.

## Acceptance Criteria

1. **Given** le port `Connector` **When** `getSessionDetail(externalId, context?)` est appele **Then** il retourne `Promise<MappedSessionData>` directement
2. **Given** le port `Connector` **When** `getSessionDetail` recoit un `context` optionnel avec `maxHeartRate` et `restingHeartRate` **Then** le connecteur peut calculer les zones FC, drift et TRIMP en interne via les services domaine
3. **Given** `listSessions()` **When** il est appele **Then** il retourne `Promise<MappedSessionSummary[]>` avec un type domaine (sportSlug au lieu de sportType brut)
4. **Given** `StravaConnector` **When** `getSessionDetail` est appele **Then** il fait l'appel API, mappe en interne (sport, unites, allure), et retourne du `MappedSessionData`
5. **Given** le `ConnectorRegistry` **When** il est simplifie **Then** il n'expose plus `getMapper()` — le registry ne fournit que `factory` + `rateLimiter`
6. **Given** le port `SessionMapper` **When** il n'est plus utilise **Then** il est supprime du domaine ainsi que ses implementations
7. **Given** les use cases `ImportSessions` et `SyncConnector` **When** ils importent une session **Then** ils appellent `connector.getSessionDetail(externalId, context)` et recoivent du `MappedSessionData` pret a persister — plus d'appel `mapper.map()`
8. **Given** tous les tests existants (import, sync, connecteur) **When** le refactoring est termine **Then** ils passent tous

## Tasks / Subtasks

- [x] Task 1 : Redefinir les types du port Connector (AC: #1, #2, #3)
  - [x] Modifier `app/domain/interfaces/connector.ts`
  - [x] `getSessionDetail(externalId: string, context?: MappingContext): Promise<MappedSessionData>`
  - [x] Definir `MappingContext { maxHeartRate?: number; restingHeartRate?: number }`
  - [x] `listSessions(filters): Promise<MappedSessionSummary[]>`
  - [x] Definir `MappedSessionSummary` (externalId, name, sportSlug, date, durationMinutes, distanceKm, avgHeartRate)
  - [x] Supprimer `SessionDetail` et `SessionSummary`
- [x] Task 2 : Internaliser le mapping dans StravaConnector (AC: #4)
  - [x] Absorber la logique de `StravaSessionMapper` + `StravaDetailedSessionMapper` dans le connecteur
  - [x] `getSessionDetail` : appel API → mapping sport (StravaSportMapper) → conversion unites → construction `MappedSessionData`
  - [x] `listSessions` : appel API → mapping → `MappedSessionSummary[]`
  - [x] Supprimer `strava_session_mapper.ts` et `strava_detailed_session_mapper.ts`
- [x] Task 3 : Simplifier ConnectorRegistry (AC: #5)
  - [x] Retirer `getMapper()` de `ConnectorRegistry` et `InMemoryConnectorRegistry`
  - [x] `ProviderEntry` = `{ factory, rateLimiter }` seulement
  - [x] Mettre a jour `app_provider.ts` : supprimer le binding `SessionMapper`, simplifier le registry
- [x] Task 4 : Supprimer le port SessionMapper (AC: #6)
  - [x] Supprimer `app/domain/interfaces/session_mapper.ts`
  - [x] Supprimer le binding dans `app_provider.ts`
- [x] Task 5 : Mettre a jour ImportSessions (AC: #7)
  - [x] Supprimer l'injection de `SessionMapper`
  - [x] Ajouter l'injection de `UserProfileRepository`
  - [x] Charger le profil une fois, construire le `MappingContext`
  - [x] `const mapped = await connector.getSessionDetail(externalId, context)`
  - [x] `sessionRepository.create(mapped)` directement
- [x] Task 6 : Mettre a jour SyncConnector (AC: #7)
  - [x] Supprimer `registry.getMapper()`
  - [x] Ajouter l'injection de `UserProfileRepository`
  - [x] Charger le profil, construire le `MappingContext`
  - [x] `const mapped = await connector.getSessionDetail(externalId, context)`
- [x] Task 7 : Mettre a jour ListPreImportSessions (AC: #3)
  - [x] Adapter au nouveau type `MappedSessionSummary`
  - [x] Le staging `import_sessions.raw_data` continue de stocker la reponse brute (le connecteur peut stocker le brut en interne avant de mapper)
- [x] Task 8 : Mettre a jour tous les tests (AC: #8)
  - [x] Tests connecteur : verifier retour `MappedSessionData`
  - [x] Tests use cases : supprimer mocks de mapper, mocker le connecteur pour retourner du `MappedSessionData`
  - [x] Tests registry : adapter a la nouvelle shape `ProviderEntry`

## Dev Notes

- **raw_data dans import_sessions** : le staging stocke la reponse brute Strava en JSONB. Ce stockage reste utile (audit, re-import). Le connecteur peut conserver le brut dans `listSessions` (le use case le passe au repository de staging) tout en retournant du mappe.
- **MappingContext** : le contexte est optionnel. Si absent, le connecteur retourne les donnees sans zones FC — meme comportement qu'aujourd'hui pour les sessions sans profil.
- **Dependency-cruiser** : le connecteur (infra) importe du domaine (services, VO) — c'est le sens autorise. Verifier que les regles dependency-cruiser ne bloquent pas `app/connectors/` → `app/domain/services/`.
- **Impact futur Garmin** : ajouter un connecteur = implementer `Connector` qui retourne du `MappedSessionData`. Plus besoin de creer un mapper separe. Plus simple.
