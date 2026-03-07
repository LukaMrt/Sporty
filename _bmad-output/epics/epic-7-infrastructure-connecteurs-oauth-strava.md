# Epic 7 : Infrastructure Connecteurs & OAuth Strava

L'utilisateur peut connecter/deconnecter Strava depuis ses parametres, voir l'etat de son connecteur, et reconnecter en cas d'erreur. L'admin configure les credentials via env.

**FRs couverts :** FR1, FR2, FR3, FR4, FR5, FR6, FR27, FR28
**Includes :** Migrations DB (connectors, import_activities, evolution sessions), chiffrement AES-256-GCM, flow OAuth complet (authorize, callback, refresh, disconnect), state machine connecteur, activation conditionnelle via env, page Connectors/Index, dependency-cruiser rules

---

## Story 7.1 : Migrations DB & modeles Lucid connecteurs

As a **dev (Luka)**,
I want **les tables connectors et import_activities, et les colonnes imported_from/external_id sur sessions**,
So that **le modele de donnees est pret pour tout le systeme d'import**.

**Acceptance Criteria:**

**Given** la base de donnees existante
**When** je lance `node ace migration:run`
**Then** la table `connectors` est creee avec : id, user_id (FK users), provider (enum: strava), status (enum: connected/error/disconnected), encrypted_access_token, encrypted_refresh_token, token_expires_at, auto_import_enabled (boolean, defaut false), polling_interval_minutes (integer, defaut 15), last_sync_at (nullable), timestamps
**And** la contrainte unique `(user_id, provider)` est en place
**And** la table `import_activities` est creee avec : id, connector_id (FK connectors), external_id, status (enum: new/imported/ignored), raw_data (JSONB), imported_session_id (FK sessions, nullable), timestamps
**And** la contrainte unique `(connector_id, external_id)` est en place
**And** la table `sessions` a les nouvelles colonnes `imported_from` (nullable) et `external_id` (nullable)
**And** les modeles Lucid `Connector` et `ImportActivity` sont crees avec les relations (belongsTo, hasMany)
**And** le modele `Connector` a les getter/setter transparents pour le chiffrement AES-256-GCM des tokens via `TokenEncryption` service
**And** le service `TokenEncryption` (`app/services/token_encryption.ts`) implemente encrypt/decrypt avec AES-256-GCM, IV unique par operation, format `base64(iv):base64(ciphertext):base64(authTag)`
**And** la variable d'env `CONNECTOR_ENCRYPTION_KEY` est validee dans `start/env.ts` (fail-fast si absente et connecteurs actifs)
**And** `node ace migration:rollback` annule proprement

---

## Story 7.2 : Domain connecteur & interface Connector

As a **dev (Luka)**,
I want **l'interface abstraite Connector dans le domain et les erreurs associees**,
So that **l'architecture extensible est en place pour accueillir Strava et de futurs connecteurs** (NFR10).

**Acceptance Criteria:**

**Given** la structure Clean Architecture existante
**When** je consulte `app/domain/interfaces/connector.ts`
**Then** l'interface `Connector` definit : `authenticate()`, `listActivities(filters)`, `getActivityDetail(id)`, `getConnectionStatus()`, `disconnect()`
**And** les erreurs domain existent dans `app/domain/errors/` : `ConnectorAuthError`, `ConnectorNotFoundError`, `RateLimitExceededError`
**And** le value object `ConnectorStatus` (connected/error/disconnected) est defini dans `app/domain/value_objects/connector_status.ts`
**And** les regles dependency-cruiser sont ajoutees dans `.dependency-cruiser.cjs` pour `app/connectors/` (infra, meme niveau que repositories)
**And** `app/domain/` n'importe depuis aucun autre dossier `app/`
**And** `pnpm lint` et `tsc --noEmit` passent

---

## Story 7.3 : Flow OAuth Strava (authorize + callback)

As a **utilisateur connecte**,
I want **connecter mon compte Strava via OAuth2**,
So that **Sporty peut acceder a mes activites Strava** (FR1).

**Acceptance Criteria:**

**Given** les credentials Strava sont configures en env (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET) (FR28)
**And** je suis sur la page Parametres > Connecteurs
**When** je clique "Connecter Strava"
**Then** je suis redirige vers `https://www.strava.com/oauth/authorize` avec les parametres client_id, redirect_uri (construit depuis APP_URL), response_type=code, scope=read,activity:read_all
**And** un parametre `state` aleatoire est genere et stocke en session (CSRF protection)

**Given** j'autorise l'acces sur le site Strava
**When** Strava me redirige vers le callback (`/connectors/strava/callback`)
**Then** le parametre `state` est verifie (correspond a celui en session)
**And** le code est echange via `POST https://www.strava.com/oauth/token` pour obtenir access_token + refresh_token
**And** les tokens sont chiffres (AES-256-GCM) et persistes dans la table `connectors` avec status `connected`
**And** je suis redirige vers `/connectors` avec un toast "Strava connecte !"

**Given** le parametre `state` ne correspond pas
**When** le callback est traite
**Then** une erreur est affichee et aucun token n'est stocke

**Given** les credentials Strava ne sont PAS configures en env (FR28)
**When** je suis sur la page Connecteurs
**Then** le bouton "Connecter Strava" n'apparait pas

**Given** j'ai deja un connecteur Strava actif
**When** je tente de connecter a nouveau
**Then** l'ancien connecteur est mis a jour avec les nouveaux tokens (pas de doublon grace a la contrainte unique)

---

## Story 7.4 : Deconnexion & reconnexion Strava

As a **utilisateur avec un connecteur Strava**,
I want **deconnecter Strava ou reconnecter en cas d'erreur**,
So that **j'ai le controle sur la connexion et je peux corriger les problemes** (FR2, FR3, FR4).

**Acceptance Criteria:**

**Given** mon connecteur Strava est en etat `connected`
**When** je suis sur la page Connecteurs
**Then** je vois l'etat "Connecte" (badge vert), la date du dernier sync, et un bouton "Deconnecter" (FR3)

**Given** je clique "Deconnecter"
**When** je confirme
**Then** une requete `POST https://www.strava.com/oauth/deauthorize` est envoyee a Strava avec l'access token
**And** les tokens sont supprimes de la base
**And** le connecteur passe en etat `disconnected`
**And** un toast confirme "Strava deconnecte" (FR2)

**Given** mon connecteur est en etat `error`
**When** je suis sur la page Connecteurs
**Then** je vois l'etat "Erreur" (badge orange) et un bouton "Reconnecter" (FR4)

**Given** je clique "Reconnecter"
**When** le flow OAuth se relance
**Then** le meme flux que Story 7.3 est execute, et le connecteur repasse en etat `connected` apres succes

**Given** la requete de deauthorize echoue (Strava indisponible)
**When** la deconnexion est traitee
**Then** les tokens sont quand meme supprimes localement et le connecteur passe en `disconnected`

---

## Story 7.5 : Refresh automatique des tokens

As a **systeme**,
I want **rafraichir automatiquement les tokens OAuth expires**,
So that **la connexion Strava reste fonctionnelle sans intervention utilisateur** (FR5, FR6).

**Acceptance Criteria:**

**Given** un appel API Strava retourne HTTP 401
**When** le `StravaHttpClient` intercepte la reponse
**Then** il tente un refresh via `POST https://www.strava.com/oauth/token` avec grant_type=refresh_token (NFR9)
**And** le nouveau refresh_token est persiste en base AVANT de continuer (FR6, persist-before-use)
**And** l'appel original est reexecute avec le nouveau access_token

**Given** le refresh reussit
**When** les tokens sont mis a jour
**Then** le connecteur reste en etat `connected`

**Given** le refresh echoue (token revoque, erreur reseau)
**When** la tentative echoue
**Then** le connecteur passe en etat `error`
**And** aucun appel API supplementaire n'est tente

**Given** le token_expires_at est dans le passe
**When** un nouvel appel API est initie
**Then** le refresh est tente proactivement avant l'appel (optimisation, evite un aller-retour 401)

---

## Story 7.6 : Page frontend Connecteurs

As a **utilisateur connecte**,
I want **une page dans mes parametres pour gerer mes connecteurs**,
So that **je peux voir l'etat de mes connexions et les gerer en un coup d'oeil** (FR3).

**Acceptance Criteria:**

**Given** je navigue vers Profil > Connecteurs
**When** la page se charge
**Then** je vois une `ConnectorCard` pour Strava affichant : logo Strava, etat (badge colore : vert connecte, orange erreur, gris deconnecte), date du dernier sync (si connecte)
**And** les boutons d'action sont contextuels : "Deconnecter" si connecte, "Reconnecter" si erreur, "Connecter" si deconnecte

**Given** les credentials admin ne sont pas configures
**When** la page se charge
**Then** aucune ConnectorCard n'est affichee, un message explique que la fonctionnalite n'est pas activee

**Given** je suis sur mobile (< 768px)
**When** je regarde la page
**Then** les ConnectorCards sont en pleine largeur, empilees verticalement

**Given** je suis sur desktop
**When** je regarde la page
**Then** les ConnectorCards sont dans une grille

**And** la navigation inclut un lien vers la page Connecteurs dans la section Profil
**And** les tokens ne sont jamais exposes dans les props Inertia (seuls provider, status, lastSyncAt sont transmis)
