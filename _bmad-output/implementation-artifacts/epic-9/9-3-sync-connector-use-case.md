# Story 9.3 : Sync connector use case

Status: draft

## Story

As a **systeme**,
I want **un use case dedie a la synchronisation d'un connecteur**,
so that **la logique de sync est isolee, testable et reutilisable par le scheduler et l'import manuel**.

## Acceptance Criteria

1. **Given** le use case `SyncConnector` **When** il est appele avec un connector_id **Then** il recupere le connecteur, verifie son etat (`connected` requis), appelle `listActivities` via l'interface Connector, et sauvegarde les nouvelles activites en staging
2. **Given** l'import auto est actif et de nouvelles activites sont detectees **When** le sync se termine **Then** les activites `new` sont importees automatiquement via ImportActivities, chaque import atomique
3. **Given** le connecteur est en etat `error` ou `disconnected` **When** le use case est appele **Then** il retourne `ConnectorAuthError` sans appeler l'API
4. **Given** le rate limit est atteint **When** le RateLimitManager bloque **Then** le sync s'arrete proprement et reprendra au prochain cycle

## Tasks / Subtasks

- [ ] Task 1 : Use case SyncConnector (AC: #1, #2, #3, #4)
  - [ ] Creer `app/use_cases/connectors/sync_connector.ts`
  - [ ] Verifier etat connecteur
  - [ ] Appeler listActivities via l'interface (pas directement Strava)
  - [ ] Sauvegarder nouvelles activites en staging
  - [ ] Si auto_import actif, importer les activites `new`
  - [ ] Mettre a jour `last_sync_at`
- [ ] Task 2 : Gestion erreurs (AC: #3, #4)
  - [ ] ConnectorAuthError si etat invalide
  - [ ] Arret propre si rate limit atteint

## Dev Notes

### Reutilisabilite

Ce use case est appele a la fois par le SyncScheduler (import auto) et potentiellement par un bouton "Synchroniser" dans l'UI (import manuel). Il doit etre independant du contexte d'appel.

### Interface Connector

Le use case appelle l'interface `Connector` du domain, pas directement `StravaConnector`. L'implementation concrete est resolue via IoC.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 9.3]
