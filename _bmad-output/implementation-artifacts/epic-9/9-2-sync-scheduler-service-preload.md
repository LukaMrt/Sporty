# Story 9.2 : Sync scheduler (service applicatif)

Status: draft

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

- [ ] Task 1 : Service SyncScheduler (AC: #1, #5)
  - [ ] Creer `app/services/sync_scheduler.ts`
  - [ ] Methode `start()` : charger connecteurs auto-import actifs, lancer `setInterval` par connecteur
  - [ ] Methode `stop()` : `clearInterval` sur tous les timers
  - [ ] Le scheduler ne contient pas de logique metier — il orchestre et delegue
- [ ] Task 2 : Integration AppProvider (AC: #1, #5)
  - [ ] Ajouter hook `ready()` dans `providers/app_provider.ts`
  - [ ] Guard : `['web', 'test'].includes(this.app.getEnvironment())`
  - [ ] Ajouter hook `shutdown()` : appeler `scheduler.stop()`
  - [ ] **Pas de preload dans `adonisrc.ts`** — le scheduler est gere par le provider, pas en preload
- [ ] Task 3 : Cycle de polling (AC: #2, #3, #4)
  - [ ] Deleguer au use case `SyncConnector` via IoC
  - [ ] Gerer les erreurs (error permanent -> stop polling, temporaire -> continue)
- [ ] Task 4 : Mise a jour dynamique (AC: #6)
  - [ ] Methodes `addConnector(id)`, `removeConnector(id)`, `updateInterval(id, minutes)`
  - [ ] Appelees depuis le controller settings (story 9.1)

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

### References

- [Source: _bmad-output/epics/epic-9-import-automatique.md#Story 9.2]
- [Source: _bmad-output/epics/epic-9-import-automatique.md#Decisions architecturales]
