# Epic 9 : Import Automatique

L'utilisateur active l'import auto, configure l'intervalle de polling, et ses nouvelles seances apparaissent automatiquement dans Sporty.

**FRs couverts :** FR14, FR15, FR16, FR17
**Includes :** Toggle auto import + config intervalle dans page Connectors, sync scheduler (preload service, setInterval), sync_connector use case, cleanup shutdown

---

## Story 9.1 : Settings auto import

As a **utilisateur avec un connecteur Strava connecte**,
I want **activer l'import automatique et configurer l'intervalle de polling**,
So that **mes nouvelles seances arrivent dans Sporty sans intervention** (FR14, FR15).

**Acceptance Criteria:**

**Given** mon connecteur Strava est en etat `connected`
**When** je suis sur la page Connecteurs
**Then** je vois un toggle "Import automatique" (OFF par defaut) et un champ "Intervalle de polling" (defaut: 15 minutes)

**Given** j'active le toggle
**When** la requete est traitee (`POST /connectors/strava/settings`)
**Then** `auto_import_enabled` passe a `true` en base
**And** un toast confirme "Import automatique active"

**Given** je modifie l'intervalle a 10 minutes
**When** je sauvegarde
**Then** `polling_interval_minutes` passe a 10 en base
**And** le prochain cycle de polling utilisera ce nouvel intervalle

**Given** je desactive le toggle
**When** la requete est traitee
**Then** `auto_import_enabled` passe a `false`
**And** le polling s'arrete pour ce connecteur
**And** un toast confirme "Import automatique desactive"

**Given** mon connecteur est en etat `error` ou `disconnected`
**When** je regarde le toggle
**Then** il est desactive et non interactif (grise)

---

## Story 9.2 : Sync scheduler (service preload)

As a **systeme**,
I want **un service qui poll Strava automatiquement selon l'intervalle configure**,
So that **les nouvelles seances sont detectees et importees sans intervention** (FR16, FR17).

**Acceptance Criteria:**

**Given** le service `SyncScheduler` dans `app/services/sync_scheduler.ts`
**When** l'application AdonisJS demarre (hook `ready`)
**Then** il charge tous les connecteurs avec `auto_import_enabled = true` et `status = 'connected'`
**And** il lance un `setInterval` par connecteur avec l'intervalle configure (`polling_interval_minutes`)

**Given** un cycle de polling se declenche pour un connecteur
**When** le scheduler execute le use case `sync_connector`
**Then** il appelle `GET /athlete/activities?after={last_sync_at}&per_page=200`
**And** les nouvelles activites sont sauvegardees en staging avec status `new`
**And** les activites en status `new` sont automatiquement importees (appel DetailedActivity + mapping + insert session) (FR17)
**And** `last_sync_at` est mis a jour sur le connecteur

**Given** l'import auto echoue (token expire, rate limit)
**When** l'erreur est detectee
**Then** le connecteur passe en etat `error` si le token est invalide
**And** le polling continue au prochain cycle si c'est une erreur temporaire (429, 500)
**And** le polling s'arrete si le connecteur passe en etat `error`

**Given** l'application AdonisJS s'arrete (hook `shutdown`)
**When** le cleanup s'execute
**Then** tous les `setInterval` sont nettoyes proprement (pas de fuite memoire)

**Given** un utilisateur modifie l'intervalle ou desactive l'auto import
**When** le changement est persiste
**Then** le scheduler met a jour ou supprime le `setInterval` correspondant

**And** le polling ne degrade pas les performances de l'UI (NFR3)

---

## Story 9.3 : Sync connector use case

As a **systeme**,
I want **un use case dedie a la synchronisation d'un connecteur**,
So that **la logique de sync est isolee, testable et reutilisable par le scheduler et l'import manuel**.

**Acceptance Criteria:**

**Given** le use case `SyncConnector` dans `app/use_cases/connectors/sync_connector.ts`
**When** il est appele avec un connector_id
**Then** il recupere le connecteur et verifie son etat (`connected` requis)
**And** il appelle `listActivities` via l'interface Connector (pas directement StravaConnector)
**And** il sauvegarde les nouvelles activites en staging

**Given** l'import auto est actif et de nouvelles activites sont detectees
**When** le sync se termine
**Then** les activites `new` sont importees automatiquement via le use case `ImportActivities`
**And** chaque import est atomique (transaction isolee par activite)

**Given** le connecteur est en etat `error` ou `disconnected`
**When** le use case est appele
**Then** il retourne une erreur `ConnectorAuthError` sans appeler l'API

**Given** le rate limit est atteint pendant le sync
**When** le `RateLimitManager` bloque
**Then** le sync s'arrete proprement et reprendra au prochain cycle
