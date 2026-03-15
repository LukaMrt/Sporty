# Story 9.3 : Sync connector use case

Status: done

## Story

As a **systeme**,
I want **un use case dedie a la synchronisation d'un connecteur, agnostique du provider**,
so that **la logique de sync est isolee, testable et reutilisable par le scheduler et l'import manuel**.

## Acceptance Criteria

1. **Given** le use case `SyncConnector` **When** il est appele avec un `connector_id` **Then** il recupere le connecteur en base, determine son `provider`, utilise `ConnectorRegistry.getFactory(provider)` pour obtenir un `Connector`, appelle `listActivities` et sauvegarde les nouvelles activites en staging
2. **Given** l'import auto est actif et de nouvelles activites sont detectees **When** le sync se termine **Then** les activites `new` sont importees via `ImportActivities` avec `ConnectorRegistry.getMapper(provider)`, chaque import atomique (transaction isolee)
3. **Given** le connecteur est en etat `error` ou `disconnected` **When** le use case est appele **Then** il retourne `ConnectorAuthError` sans appeler l'API
4. **Given** le rate limit est atteint **When** `ConnectorRegistry.getRateLimitManager(provider)` bloque **Then** le sync s'arrete proprement et reprendra au prochain cycle

## Tasks / Subtasks

- [x] Task 1 : Port ConnectorRegistry (prerequis)
  - [x] Creer `app/domain/interfaces/connector_registry.ts` (classe abstraite)
  - [x] Methodes : `getFactory(provider)`, `getMapper(provider)`, `getRateLimitManager(provider)`
- [x] Task 2 : Implementation InMemoryConnectorRegistry
  - [x] Creer `app/connectors/in_memory_connector_registry.ts`
  - [x] `Map<ConnectorProvider, { factory, mapper, rateLimiter }>`
  - [x] Methode `register(provider, { factory, mapper, rateLimiter })`
- [x] Task 3 : Wiring dans AppProvider
  - [x] Modifier `providers/app_provider.ts`
  - [x] Creer le registry, y enregistrer Strava, binder dans le container
  - [x] Mettre a jour `ConnectorProvider` value object si necessaire
- [x] Task 4 : Use case SyncConnector (AC: #1, #2, #3, #4)
  - [x] Creer `app/use_cases/connectors/sync_connector.ts`
  - [x] Injection : `ConnectorRegistry`, `ConnectorRepository`, `ImportActivityRepository`
  - [x] Verifier etat connecteur (`connected` requis)
  - [x] Resoudre factory/mapper/rateLimiter via `ConnectorRegistry.get*(provider)`
  - [x] Appeler `listActivities` via l'abstraction `Connector`
  - [x] Sauvegarder nouvelles activites en staging
  - [x] Si `auto_import_enabled`, importer les activites `new` via `ImportActivities`
  - [x] Mettre a jour `last_sync_at`
- [x] Task 5 : Gestion erreurs (AC: #3, #4)
  - [x] `ConnectorAuthError` si etat invalide
  - [x] Arret propre si rate limit atteint (`RateLimitExceededError`)

## Dev Notes

### ConnectorRegistry — point d'abstraction central

Le use case ne connait aucun provider specifique. Tout est resolu dynamiquement via le `ConnectorRegistry` :

```
sync_connector(connectorId)
  -> repo.find(connectorId) -> { provider, userId, lastSyncAt }
  -> registry.getFactory(provider).make(userId) -> Connector
  -> connector.listActivities({ after: lastSyncAt })
  -> upsert staging
  -> registry.getMapper(provider).map(detail) -> MappedSessionData
  -> import session
```

### Ajouter un nouveau provider

Zero modification dans ce use case. Il suffit de :
1. Ajouter une entree dans `ConnectorProvider` value object
2. Implementer `Connector`, `ConnectorFactory`, `ActivityMapper`, `RateLimitManager`
3. Enregistrer dans le registry via `AppProvider`

### Reutilisabilite

Ce use case est appele a la fois par :
- Le `SyncScheduler` (import auto, story 9.2)
- Potentiellement un bouton "Synchroniser" dans l'UI (import manuel)

Il est independant du contexte d'appel.

### References

- [Source: _bmad-output/epics/epic-9-import-automatique.md#Story 9.3]
- [Source: _bmad-output/epics/epic-9-import-automatique.md#Decisions architecturales]

## Dev Agent Record

### Implementation Notes

- `RateLimitManager` abstract extrait vers `app/domain/interfaces/rate_limit_manager.ts` pour respecter la regle clean archi (domain n'importe rien depuis connectors). `app/connectors/rate_limit_manager.ts` re-exporte pour compatibilite des importeurs existants.
- `ConnectorStatus.Disconnected` ajoute au value object (AC#3).
- `ConnectorRepository` enrichi : `findById(id)` et `updateLastSyncAt(id)` — necessaires pour que le use case soit agnostique du provider.
- `SyncConnector` reecrit : input reduit a `{ connectorId }`, userId et provider resolus depuis la BD via `findById`.
- `SyncFn` dans `SyncScheduler` simplifiee : ne prend plus `userId` (gere en interne par le use case).
- 10 tests unitaires couvrant les 4 AC + cas limites.

### File List

- `app/domain/interfaces/rate_limit_manager.ts` (nouveau)
- `app/domain/interfaces/connector_registry.ts` (nouveau)
- `app/domain/interfaces/connector_repository.ts` (modifie — findById, updateLastSyncAt, ConnectorByIdRecord)
- `app/domain/value_objects/connector_status.ts` (modifie — Disconnected)
- `app/connectors/rate_limit_manager.ts` (modifie — re-export depuis domain)
- `app/connectors/in_memory_connector_registry.ts` (nouveau)
- `app/repositories/lucid_connector_repository.ts` (modifie — findById, updateLastSyncAt)
- `app/use_cases/connectors/sync_connector.ts` (modifie — refactoring registry)
- `app/services/sync_scheduler.ts` (modifie — SyncFn sans userId)
- `providers/app_provider.ts` (modifie — ConnectorRegistry binding)
- `tests/unit/use_cases/connectors/sync_connector.spec.ts` (modifie — réécriture pour registry)
- `tests/unit/services/sync_scheduler.spec.ts` (modifie — SyncFn sans userId)
- `tests/unit/connectors/strava/strava_http_client.spec.ts` (modifie — mock findById/updateLastSyncAt)
- `tests/unit/services/strava/strava_http_client.spec.ts` (modifie — mock findById/updateLastSyncAt)
- `tests/unit/use_cases/connectors/update_connector_settings.spec.ts` (modifie — mock findById/updateLastSyncAt)

### Change Log

- Story 9.3 implementee — ConnectorRegistry pattern, SyncConnector refactorised, 358 tests passants (2026-03-14)
