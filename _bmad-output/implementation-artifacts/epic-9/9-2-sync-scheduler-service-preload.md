# Story 9.2 : Sync scheduler (service preload)

Status: draft

## Story

As a **systeme**,
I want **un service qui poll Strava automatiquement selon l'intervalle configure**,
so that **les nouvelles seances sont detectees et importees sans intervention** (FR16, FR17).

## Acceptance Criteria

1. **Given** le service `SyncScheduler` **When** l'application demarre (hook `ready`) **Then** il charge tous les connecteurs avec `auto_import_enabled = true` et `status = 'connected'` et lance un `setInterval` par connecteur
2. **Given** un cycle de polling se declenche **When** le scheduler execute sync_connector **Then** il fetch les nouvelles activites, les sauvegarde en staging, et les importe automatiquement
3. **Given** l'import auto echoue (token expire) **When** l'erreur est detectee **Then** le connecteur passe en `error` et le polling s'arrete pour ce connecteur
4. **Given** une erreur temporaire (429, 500) **When** le cycle echoue **Then** le polling continue au prochain cycle
5. **Given** l'application s'arrete (hook `shutdown`) **When** le cleanup s'execute **Then** tous les `setInterval` sont nettoyes
6. **Given** un utilisateur modifie l'intervalle ou desactive l'auto import **When** le changement est persiste **Then** le scheduler met a jour ou supprime le `setInterval`

## Tasks / Subtasks

- [ ] Task 1 : Service SyncScheduler (AC: #1, #5)
  - [ ] Creer `app/services/sync_scheduler.ts`
  - [ ] Hook `ready` : charger connecteurs auto-import actifs
  - [ ] Lancer un `setInterval` par connecteur
  - [ ] Hook `shutdown` : clearInterval sur tous les timers
- [ ] Task 2 : Cycle de polling (AC: #2, #3, #4)
  - [ ] Appeler le use case SyncConnector
  - [ ] Gerer les erreurs (error -> stop, temporaire -> continue)
- [ ] Task 3 : Mise a jour dynamique (AC: #6)
  - [ ] Methodes `addConnector(id)`, `removeConnector(id)`, `updateInterval(id, minutes)`
  - [ ] Appelees depuis le controller settings
- [ ] Task 4 : Preload registration
  - [ ] Enregistrer le service comme preload dans `adonisrc.ts`

## Dev Notes

### Preload AdonisJS

Le service doit etre enregistre comme preload pour demarrer avec l'application. Il utilise les hooks `ready` et `shutdown` du lifecycle AdonisJS.

### Pas de fuite memoire

Chaque `setInterval` est stocke dans un Map avec le connector_id comme cle. Au shutdown ou a la suppression, `clearInterval` est appele systematiquement.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 9.2]
