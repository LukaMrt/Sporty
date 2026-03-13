# Story 9.3 : Sync connector use case

Status: draft

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

- [ ] Task 1 : Port ConnectorRegistry (prerequis)
  - [ ] Creer `app/domain/interfaces/connector_registry.ts` (classe abstraite)
  - [ ] Methodes : `getFactory(provider)`, `getMapper(provider)`, `getRateLimitManager(provider)`
- [ ] Task 2 : Implementation InMemoryConnectorRegistry
  - [ ] Creer `app/connectors/in_memory_connector_registry.ts`
  - [ ] `Map<ConnectorProvider, { factory, mapper, rateLimiter }>`
  - [ ] Methode `register(provider, { factory, mapper, rateLimiter })`
- [ ] Task 3 : Wiring dans AppProvider
  - [ ] Modifier `providers/app_provider.ts`
  - [ ] Creer le registry, y enregistrer Strava, binder dans le container
  - [ ] Mettre a jour `ConnectorProvider` value object si necessaire
- [ ] Task 4 : Use case SyncConnector (AC: #1, #2, #3, #4)
  - [ ] Creer `app/use_cases/connectors/sync_connector.ts`
  - [ ] Injection : `ConnectorRegistry`, `ConnectorRepository`, `ImportActivityRepository`
  - [ ] Verifier etat connecteur (`connected` requis)
  - [ ] Resoudre factory/mapper/rateLimiter via `ConnectorRegistry.get*(provider)`
  - [ ] Appeler `listActivities` via l'abstraction `Connector`
  - [ ] Sauvegarder nouvelles activites en staging
  - [ ] Si `auto_import_enabled`, importer les activites `new` via `ImportActivities`
  - [ ] Mettre a jour `last_sync_at`
- [ ] Task 5 : Gestion erreurs (AC: #3, #4)
  - [ ] `ConnectorAuthError` si etat invalide
  - [ ] Arret propre si rate limit atteint (`RateLimitExceededError`)

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
