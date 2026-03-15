# Epic 9 : Import Automatique

L'utilisateur active l'import auto, configure l'intervalle de polling, et ses nouvelles seances apparaissent automatiquement dans Sporty.

**FRs couverts :** FR14, FR15, FR16, FR17
**Includes :** Toggle auto import + config intervalle dans page Connectors, ConnectorRegistry (abstraction multi-provider), sync scheduler (service applicatif, setInterval), sync_connector use case, cleanup shutdown

---

## Decisions architecturales

### ConnectorRegistry (abstraction multi-provider)

Pour permettre l'ajout futur de connecteurs (Garmin, Polar, Suunto...) sans modifier le scheduler ni les use cases, on introduit un **`ConnectorRegistry`** :

- **Port** : `app/domain/interfaces/connector_registry.ts` (classe abstraite)
  - `getFactory(provider: ConnectorProvider): ConnectorFactory`
  - `getMapper(provider: ConnectorProvider): ActivityMapper`
  - `getRateLimitManager(provider: ConnectorProvider): RateLimitManager`
- **Implementation** : `app/connectors/in_memory_connector_registry.ts`
  - Simple `Map<ConnectorProvider, { factory, mapper, rateLimiter }>` construit au boot
- **Wiring** : `providers/app_provider.ts` enregistre chaque provider dans le registry

Le `SyncScheduler` et `SyncConnector` ne manipulent que des abstractions du domaine via le registry. Zero import de code specifique a un provider.

Ajouter un nouveau provider = ajouter une entree dans `ConnectorProvider` + implementer `Connector`, `ConnectorFactory`, `ActivityMapper`, `RateLimitManager` + enregistrer dans le registry. Zero modification dans le scheduler ou les use cases existants.

### Deploiement mono-process

Le `SyncScheduler` tourne dans le meme process Node.js que le serveur HTTP :

- **Demarrage** : hook `ready()` de `AppProvider` (apres le boot de tous les providers)
- **Arret** : hook `shutdown()` de `AppProvider` (`clearInterval` sur tous les timers)
- **Environnements** : le scheduler demarre en env `web` et `test` (pas en `console` ni `repl`)
- **Docker** : aucune modification au `Dockerfile`, `docker-compose.yml`, ou `entrypoint.sh`
- Le flag `shutdownInReverseOrder: true` (deja configure dans `adonisrc.ts`) garantit que le scheduler s'arrete en dernier

Criteres de separation future (non necessaires aujourd'hui) :
- Le polling degrade les performances HTTP
- Passage en multi-instance (necessite lock distribue)
- Ajout de jobs lourds (traitement GPS, analytics)

### Fichiers crees/modifies

| Fichier | Action |
|---|---|
| `app/domain/interfaces/connector_registry.ts` | Creer — port abstrait |
| `app/connectors/in_memory_connector_registry.ts` | Creer — implementation |
| `app/services/sync_scheduler.ts` | Creer — service applicatif |
| `app/use_cases/connectors/sync_connector.ts` | Creer — use case |
| `providers/app_provider.ts` | Modifier — ajouter registry, `ready()`, `shutdown()` |
| `app/domain/value_objects/connector_provider.ts` | Modifier — enum extensible |

---

## Story 9.1 : Settings auto import

As a **utilisateur avec un connecteur connecte**,
I want **activer l'import automatique et configurer l'intervalle de polling**,
So that **mes nouvelles seances arrivent dans Sporty sans intervention** (FR14, FR15).

**Acceptance Criteria:**

**Given** mon connecteur est en etat `connected`
**When** je suis sur la page Connecteurs
**Then** je vois un toggle "Import automatique" (OFF par defaut) et un champ "Intervalle de polling" (defaut: 15 minutes)

**Given** j'active le toggle
**When** la requete est traitee (`POST /connectors/:provider/settings`)
**Then** `auto_import_enabled` passe a `true` en base
**And** un toast confirme "Import automatique active"
**And** le `SyncScheduler` demarre un `setInterval` pour ce connecteur

**Given** je modifie l'intervalle a 10 minutes
**When** je sauvegarde
**Then** `polling_interval_minutes` passe a 10 en base
**And** le `SyncScheduler` met a jour le `setInterval` correspondant avec le nouvel intervalle

**Given** je desactive le toggle
**When** la requete est traitee
**Then** `auto_import_enabled` passe a `false`
**And** le `SyncScheduler` supprime le `setInterval` correspondant
**And** un toast confirme "Import automatique desactive"

**Given** mon connecteur est en etat `error` ou `disconnected`
**When** je regarde le toggle
**Then** il est desactive et non interactif (grise)

---

## Story 9.2 : Sync scheduler (service applicatif)

As a **systeme**,
I want **un service qui poll les connecteurs automatiquement selon l'intervalle configure**,
So that **les nouvelles seances sont detectees et importees sans intervention** (FR16, FR17).

**Contexte technique :** Le `SyncScheduler` est un service applicatif (pas un use case). Il orchestre des `setInterval` et delegue au use case `SyncConnector`. Il ne contient pas de logique metier. Il utilise le `ConnectorRegistry` pour resoudre les abstractions par provider.

**Acceptance Criteria:**

**Given** le service `SyncScheduler` dans `app/services/sync_scheduler.ts`
**When** l'application AdonisJS demarre (hook `ready` de `AppProvider`)
**And** l'environnement est `web` ou `test`
**Then** il charge tous les connecteurs avec `auto_import_enabled = true` et `status = 'connected'`
**And** il lance un `setInterval` par connecteur avec l'intervalle configure (`polling_interval_minutes`)

**Given** un cycle de polling se declenche pour un connecteur
**When** le scheduler delegue au use case `SyncConnector`
**Then** le use case gere la logique de sync via le `ConnectorRegistry` (resolution du bon `ConnectorFactory`, `ActivityMapper`, `RateLimitManager` selon le `provider` du connecteur)
**And** les nouvelles activites sont sauvegardees en staging avec status `new`
**And** les activites `new` sont automatiquement importees (FR17)
**And** `last_sync_at` est mis a jour sur le connecteur

**Given** l'import auto echoue (token expire, rate limit)
**When** l'erreur est detectee
**Then** le connecteur passe en etat `error` si le token est invalide
**And** le polling continue au prochain cycle si c'est une erreur temporaire (429, 500)
**And** le polling s'arrete si le connecteur passe en etat `error`

**Given** l'application AdonisJS s'arrete (hook `shutdown` de `AppProvider`)
**When** le cleanup s'execute
**Then** tous les `setInterval` sont nettoyes proprement (pas de fuite memoire)

**Given** un utilisateur modifie l'intervalle ou desactive l'auto import (story 9.1)
**When** le changement est persiste
**Then** le scheduler met a jour ou supprime le `setInterval` correspondant

**And** le polling ne degrade pas les performances de l'UI (NFR3)

---

## Story 9.3 : Sync connector use case

As a **systeme**,
I want **un use case dedie a la synchronisation d'un connecteur, agnostique du provider**,
So that **la logique de sync est isolee, testable et reutilisable par le scheduler et l'import manuel**.

**Contexte technique :** Le use case recoit le `ConnectorRegistry` en injection. Il resout dynamiquement le bon `ConnectorFactory`, `ActivityMapper` et `RateLimitManager` selon le `provider` du connecteur. Aucun import de code specifique a un provider.

**Acceptance Criteria:**

**Given** le use case `SyncConnector` dans `app/use_cases/connectors/sync_connector.ts`
**When** il est appele avec un `connector_id`
**Then** il recupere le connecteur en base et determine son `provider`
**And** il utilise `ConnectorRegistry.getFactory(provider)` pour obtenir une instance de `Connector`
**And** il appelle `listActivities` via l'abstraction `Connector` (jamais directement un provider specifique)
**And** il sauvegarde les nouvelles activites en staging

**Given** l'import auto est actif et de nouvelles activites sont detectees
**When** le sync se termine
**Then** les activites `new` sont importees automatiquement via le use case `ImportActivities`
**And** le mapping utilise `ConnectorRegistry.getMapper(provider)` pour resoudre le bon `ActivityMapper`
**And** chaque import est atomique (transaction isolee par activite)

**Given** le connecteur est en etat `error` ou `disconnected`
**When** le use case est appele
**Then** il retourne une erreur `ConnectorAuthError` sans appeler l'API

**Given** le rate limit est atteint pendant le sync
**When** `ConnectorRegistry.getRateLimitManager(provider)` bloque
**Then** le sync s'arrete proprement et reprendra au prochain cycle
