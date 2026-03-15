# Story 9.2 : Sync scheduler (service applicatif)

Status: review

## Story

As a **systeme**,
I want **un service qui poll les connecteurs automatiquement selon l'intervalle configure**,
so that **les nouvelles seances sont detectees et importees sans intervention** (FR16, FR17).

## Acceptance Criteria

1. **Given** le service `SyncScheduler` **When** l'application demarre (hook `ready` de `AppProvider`) et l'environnement est `web` ou `test` **Then** il charge tous les connecteurs avec `auto_import_enabled = true` et `status = 'connected'` et lance un `setInterval` par connecteur
2. **Given** un cycle de polling se declenche **When** le scheduler delegue au use case `SyncConnector` **Then** le use case gere la sync via le `ConnectorRegistry` (resolution des abstractions par provider), les activites sont sauvegardees en staging et importees automatiquement
3. **Given** l'import auto echoue (token expire) **When** l'erreur est detectee **Then** le connecteur passe en `error` et le polling s'arrete pour ce connecteur
4. **Given** une erreur temporaire (429, 500) **When** le cycle echoue **Then** le polling continue au prochain cycle
5. **Given** l'application s'arrete (hook `shutdown` de `AppProvider`) **When** le cleanup s'execute **Then** tous les `setInterval` sont nettoyes
6. **Given** un utilisateur modifie l'intervalle ou desactive l'auto import **When** le changement est persiste **Then** le scheduler met a jour ou supprime le `setInterval`

## Tasks / Subtasks

- [x] Task 1 : Service SyncScheduler (AC: #1, #5)
  - [x] Creer `app/services/sync_scheduler.ts`
  - [x] Methode `start()` : charger connecteurs auto-import actifs, lancer `setInterval` par connecteur
  - [x] Methode `stop()` : `clearInterval` sur tous les timers
  - [x] Le scheduler ne contient pas de logique metier — il orchestre et delegue
- [x] Task 2 : Integration AppProvider (AC: #1, #5)
  - [x] Ajouter hook `ready()` dans `providers/app_provider.ts`
  - [x] Guard : `['web', 'test'].includes(this.app.getEnvironment())`
  - [x] Ajouter hook `shutdown()` : appeler `scheduler.stop()`
  - [x] **Pas de preload dans `adonisrc.ts`** — le scheduler est gere par le provider, pas en preload
- [x] Task 3 : Cycle de polling (AC: #2, #3, #4)
  - [x] Deleguer au use case `SyncConnector` via IoC
  - [x] Gerer les erreurs (error permanent -> stop polling, temporaire -> continue)
- [x] Task 4 : Mise a jour dynamique (AC: #6)
  - [x] Methodes `addConnector(id)`, `removeConnector(id)`, `updateInterval(id, minutes)`
  - [x] Appelees depuis le controller settings (story 9.1)

## Dev Notes

### Service applicatif, pas un use case

Le `SyncScheduler` est un service applicatif d'orchestration. Il gere les timers et delegue la logique metier au use case `SyncConnector`. Il ne manipule jamais directement les APIs des providers.

### Demarrage via AppProvider (pas preload)

Le scheduler demarre dans le hook `ready()` de `AppProvider`, pas comme un preload dans `adonisrc.ts`. Cela garantit que tous les bindings IoC sont disponibles (providers, registry, repositories) avant le demarrage.

### Environnements web + test

Le guard `['web', 'test'].includes(this.app.getEnvironment())` permet :
- **web** : fonctionnement normal en production et developpement
- **test** : les tests d'integration peuvent verifier le comportement du scheduler
- **console/repl** : pas de scheduler pour les commandes ace et le REPL

### Pas de fuite memoire

Chaque `setInterval` est stocke dans un `Map<number, NodeJS.Timeout>` avec le `connector_id` comme cle. Au shutdown ou a la suppression, `clearInterval` est appele systematiquement.

### Deploiement

Aucune modification Docker necessaire. Le scheduler tourne dans le meme process Node.js que le serveur HTTP. Le flag `shutdownInReverseOrder: true` (deja dans `adonisrc.ts`) garantit un arret propre.

### Decision architecturale : SyncScheduler sans import des use cases

`app/services/` ne peut pas importer `app/use_cases/` (regle `infra-no-http-nor-usecases`). Solution : injection d'une `SyncFn` callback dans le constructeur. Le `AppProvider` (composition root) fournit la fonction qui resout le use case via IoC — sans couplage statique.

### Decision architecturale : port ConnectorScheduler en domain

Le controller `ConnectorSettingsController` ne peut pas importer depuis `app/services/` (regle `controllers-no-direct-infra`). Solution : port abstrait `ConnectorScheduler` defini dans `app/domain/interfaces/`. Le controller injecte le port, l'implementation est liee dans le provider.

### References

- [Source: _bmad-output/epics/epic-9-import-automatique.md#Story 9.2]
- [Source: _bmad-output/epics/epic-9-import-automatique.md#Decisions architecturales]

## Dev Agent Record

### Implementation Plan

1. Port `ConnectorRepository.findAllAutoImportEnabled()` + type `ActiveConnectorRecord`
2. Port abstrait `ConnectorScheduler` en domain (pour injectabilite depuis controller)
3. Use case `SyncConnector` : staging 24h + import automatique des activites `New`
4. Service `SyncScheduler` : Map de timers, SyncFn callback, start/stop/add/remove/update
5. `AppProvider` : singleton `ConnectorScheduler`, hooks `ready()` et `shutdown()`
6. `ConnectorSettingsController` : injection `ConnectorScheduler`, appel add/remove apres update

### Completion Notes

- Tous les AC satisfaits (AC#1 a AC#6)
- 9 tests unitaires pour `SyncScheduler` (timers, comportements permanent/temporaire/succes)
- 6 tests unitaires pour `SyncConnector` (connector null, 0 new, import, sport inconnu, auth error, rate limit)
- Fix bonus : `eslint.config.js` — conflit de plugin `@typescript-eslint` avec ESLint 9/10

## File List

- `app/domain/interfaces/connector_scheduler.ts` (nouveau)
- `app/domain/interfaces/connector_repository.ts` (modifie : + ActiveConnectorRecord + findAllAutoImportEnabled)
- `app/services/sync_scheduler.ts` (nouveau)
- `app/use_cases/connectors/sync_connector.ts` (nouveau)
- `app/use_cases/connectors/update_connector_settings.ts` (modifie : findFullByUserAndProvider, retourne connectorId)
- `app/repositories/lucid_connector_repository.ts` (modifie : + findAllAutoImportEnabled)
- `app/controllers/connectors/connector_settings_controller.ts` (modifie : + ConnectorScheduler)
- `providers/app_provider.ts` (modifie : + singleton ConnectorScheduler, ready, shutdown)
- `eslint.config.js` (modifie : fix conflit plugin typescript-eslint)
- `package.json` (modifie : eslint ~10.0.3)
- `tests/unit/services/sync_scheduler.spec.ts` (nouveau)
- `tests/unit/use_cases/connectors/sync_connector.spec.ts` (nouveau)
- `tests/unit/connectors/strava/strava_http_client.spec.ts` (modifie : + findAllAutoImportEnabled mock)
- `tests/unit/services/strava/strava_http_client.spec.ts` (modifie : + findAllAutoImportEnabled mock)
- `tests/unit/use_cases/connectors/update_connector_settings.spec.ts` (modifie : findFullByUserAndProvider mock)

## Change Log

- 2026-03-14 : Implementation complete de la story 9.2 — SyncScheduler service applicatif
