---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
status: complete
completedAt: '2026-03-08'
inputDocuments:
  - prd-import-connectors.md
  - architecture-import-connectors.md
  - ux-design-specification.md
  - technical-api-strava-research-2026-03-07.md
---

# Sporty (Import & Connecteurs) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Sporty (Import & Connecteurs), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories. This document is an addendum to the main epics.md covering the base Sporty application (Epics 1-6).

## Requirements Inventory

### Functional Requirements

FR1: Un utilisateur peut connecter un compte Strava via OAuth2 depuis ses parametres
FR2: Un utilisateur peut deconnecter un connecteur Strava depuis ses parametres
FR3: Un utilisateur peut consulter l'etat de son connecteur (connecte / erreur / deconnecte)
FR4: Un utilisateur peut reconnecter un connecteur en etat d'erreur
FR5: Le systeme rafraichit automatiquement les tokens OAuth expires
FR6: Le systeme persiste le nouveau refresh token avant de traiter toute reponse API
FR7: Un utilisateur peut consulter la liste de ses seances Strava non importees
FR8: Un utilisateur peut filtrer les seances pre-import par plage de dates
FR9: Un utilisateur peut voir les details d'une seance pre-import (date, nom, type, duree, distance)
FR10: Un utilisateur peut distinguer visuellement les seances nouvelles, importees et ignorees
FR11: Un utilisateur peut selectionner plusieurs seances pour un import en lot
FR12: Un utilisateur peut suivre la progression d'un import en lot
FR13: Un utilisateur peut ignorer une seance (la marquer comme non pertinente)
FR14: Un utilisateur peut activer ou desactiver l'import automatique
FR15: Un utilisateur peut configurer l'intervalle de polling
FR16: Le systeme recupere automatiquement les nouvelles seances Strava selon l'intervalle configure
FR17: Le systeme importe automatiquement les nouvelles seances detectees quand l'import auto est actif
FR18: Le systeme mappe les activites Strava vers le modele de seance Sporty
FR19: Le systeme mappe les sport_types Strava vers les types de sport Sporty
FR20: Le systeme importe les donnees disponibles meme si le mapping est partiel
FR21: Le systeme conserve la metadonnee source sur chaque seance importee
FR22: Les seances importees sont integrees dans le calendrier, les stats et le dashboard
FR23: Le systeme affiche l'etat d'erreur du connecteur quand le token est invalide ou l'API indisponible
FR24: Le systeme gere le rate limiting Strava (backoff, file d'attente)
FR25: Le systeme gere les activites avec des donnees incompletes sans bloquer l'import
FR26: Les seances deja importees ne sont pas affectees par une deconnexion ou une erreur du connecteur
FR27: L'administrateur peut configurer les credentials Strava via variables d'environnement
FR28: Le bouton "Connecter Strava" n'apparait que si les credentials admin sont configures
FR29: La plage temporelle par defaut pour la liste pre-import est de 1 mois

### NonFunctional Requirements

NFR1: Le chargement de la liste pre-import (1 mois) repond en moins de 5 secondes
NFR2: L'import d'une seance individuelle repond en moins de 3 secondes
NFR3: Le polling en arriere-plan ne degrade pas les performances de l'UI
NFR4: L'application reste reactive pendant un import en lot
NFR5: L'integration respecte les rate limits Strava (100 req/15min, 1000/jour)
NFR6: Les headers de rate limiting sont lus apres chaque requete
NFR7: En cas de HTTP 429, backoff exponentiel avec jitter (1s, 2s, 4s, 8s + random 0-500ms)
NFR8: En cas d'erreur serveur Strava (500/503), retry avec backoff, max 3 tentatives
NFR9: En cas de HTTP 401, tentative de refresh token avant de marquer le connecteur en erreur
NFR10: L'architecture suit le pattern Connector pour permettre l'ajout de futures sources

### Additional Requirements

From Architecture:
- Migrations DB : tables `connectors`, `import_activities`, colonnes `imported_from`/`external_id` sur `sessions`
- Chiffrement AES-256-GCM pour tokens OAuth via getter/setter Lucid transparent
- Cle de chiffrement obligatoire via `CONNECTOR_ENCRYPTION_KEY` (fail-fast si absente)
- Protection CSRF OAuth via parametre `state` en session
- HTTP client custom `StravaHttpClient` (fetch natif + retry + rate limit tracking)
- Rate limit manager en memoire (singleton IoC), tracking budget 15min et journalier
- Import batch sequentiel, progression en memoire serveur, polling frontend GET /import/progress
- Background polling via service AdonisJS preload, setInterval par connecteur actif
- OAuth redirect_uri construit depuis `APP_URL`, compatible reverse proxy
- Clean Architecture : interface Connector dans domain, implementations dans `app/connectors/`
- Dependency-cruiser : regles de frontieres pour `app/connectors/` (infra)
- Import atomique par activite (transaction isolee, echec != blocage du batch)
- Format ciphertext : `base64(iv):base64(ciphertext):base64(authTag)` separes par `:`

From UX (design system global):
- Responsive mobile-first, breakpoint ~768px (colonne unique -> grille)
- Shadcn DataTable pour le tableau d'import, vue cards sur mobile
- Badges colores par etat : nouvelle (bleu), importee (vert), ignoree (gris)
- Zones tactiles minimum 44x44px, contraste WCAG AA (4.5:1)
- Navigation clavier sur le tableau d'import
- Animations minimales, transitions fluides mais discretes
- Palette sobre : accent bleu, pas de rouge pour les erreurs (orange doux / gris neutre)

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 7 | Connecter Strava via OAuth2 |
| FR2 | Epic 7 | Deconnecter un connecteur |
| FR3 | Epic 7 | Consulter l'etat du connecteur |
| FR4 | Epic 7 | Reconnecter un connecteur en erreur |
| FR5 | Epic 7 | Refresh automatique des tokens |
| FR6 | Epic 7 | Persist-before-use du refresh token |
| FR7 | Epic 8 | Liste des seances non importees |
| FR8 | Epic 8 | Filtre par plage de dates |
| FR9 | Epic 8 | Details d'une seance pre-import |
| FR10 | Epic 8 | Etats visuels (nouvelle/importee/ignoree) |
| FR11 | Epic 8 | Selection multiple |
| FR12 | Epic 8 | Progression d'import |
| FR13 | Epic 8 | Ignorer une seance |
| FR14 | Epic 9 | Activer/desactiver l'import auto |
| FR15 | Epic 9 | Configurer l'intervalle de polling |
| FR16 | Epic 9 | Recuperation automatique des nouvelles seances |
| FR17 | Epic 9 | Import automatique |
| FR18 | Epic 8 | Mapping activites Strava -> Sporty |
| FR19 | Epic 8 | Mapping sport_types |
| FR20 | Epic 8 | Import avec mapping partiel |
| FR21 | Epic 8 | Metadonnee source |
| FR22 | Epic 8 | Integration calendrier/stats/dashboard |
| FR23 | Epic 10 | Affichage etat erreur connecteur |
| FR24 | Epic 10 | Gestion rate limiting |
| FR25 | Epic 8 | Gestion donnees incompletes |
| FR26 | Epic 10 | Isolation donnees importees |
| FR27 | Epic 7 | Config credentials admin via env |
| FR28 | Epic 7 | Activation conditionnelle bouton Strava |
| FR29 | Epic 8 | Plage par defaut 1 mois |

## Epic List

### Epic 7 : Infrastructure Connecteurs & OAuth Strava

L'utilisateur peut connecter/deconnecter Strava depuis ses parametres, voir l'etat de son connecteur, et reconnecter en cas d'erreur. L'admin configure les credentials via env.
**FRs couverts :** FR1, FR2, FR3, FR4, FR5, FR6, FR27, FR28
**Includes :** Migrations DB (connectors, import_activities, evolution sessions), chiffrement AES-256-GCM, flow OAuth complet (authorize, callback, refresh, disconnect), state machine connecteur, activation conditionnelle via env, page Connectors/Index, dependency-cruiser rules

### Epic 8 : Import Manuel de Seances

L'utilisateur voit ses seances Strava dans un tableau, les filtre, les selectionne et les importe en lot avec un compteur de progression. Il peut aussi ignorer des seances non pertinentes.
**FRs couverts :** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR18, FR19, FR20, FR21, FR22, FR25, FR29
**Includes :** StravaHttpClient + RateLimitManager, activity mapper + sport mapper, page Import/Index (DataTable, selection multiple, badges d'etat, vue cards mobile), import batch sequentiel + progression, integration calendrier/stats/dashboard, mapping partiel, metadonnee `imported_from`

### Epic 9 : Import Automatique

L'utilisateur active l'import auto, configure l'intervalle de polling, et ses nouvelles seances apparaissent automatiquement dans Sporty.
**FRs couverts :** FR14, FR15, FR16, FR17
**Includes :** Toggle auto import + config intervalle dans page Connectors, sync scheduler (preload service, setInterval), sync_connector use case, cleanup shutdown

### Epic 10 : Resilience & Gestion d'Erreurs

Le systeme absorbe les erreurs API, gere le rate limiting intelligemment, et communique clairement les problemes a l'utilisateur. Les donnees importees sont toujours en securite.
**FRs couverts :** FR23, FR24, FR26
**Includes :** State machine erreur connecteur avec affichage, rate limit manager avance (file d'attente, backoff), isolation donnees importees

## Epic 7 : Infrastructure Connecteurs & OAuth Strava

L'utilisateur peut connecter/deconnecter Strava depuis ses parametres, voir l'etat de son connecteur, et reconnecter en cas d'erreur. L'admin configure les credentials via env.

### Story 7.1 : Migrations DB & modeles Lucid connecteurs

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

### Story 7.2 : Domain connecteur & interface Connector

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

### Story 7.3 : Flow OAuth Strava (authorize + callback)

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

### Story 7.4 : Deconnexion & reconnexion Strava

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

### Story 7.5 : Refresh automatique des tokens

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

### Story 7.6 : Page frontend Connecteurs

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

## Epic 8 : Import Manuel de Seances

L'utilisateur voit ses seances Strava dans un tableau, les filtre, les selectionne et les importe en lot avec un compteur de progression. Il peut aussi ignorer des seances non pertinentes.

### Story 8.1 : StravaHttpClient & RateLimitManager

As a **dev (Luka)**,
I want **un client HTTP Strava avec gestion du rate limiting**,
So that **tous les appels API Strava passent par un wrapper fiable qui respecte les limites** (NFR5, NFR6, NFR7, NFR8).

**Acceptance Criteria:**

**Given** le `StravaHttpClient` dans `app/connectors/strava/strava_http_client.ts`
**When** il effectue un appel API
**Then** il utilise `fetch` natif Node.js avec le bearer token du connecteur
**And** il lit les headers `X-RateLimit-Usage` (gestion casse insensible) apres chaque reponse (NFR6)
**And** il met a jour le `RateLimitManager` avec les compteurs 15min et journalier

**Given** l'API retourne HTTP 429
**When** le client intercepte la reponse
**Then** il applique un backoff exponentiel avec jitter : 1s, 2s, 4s, 8s + random 0-500ms (NFR7)
**And** il reessaie la requete apres le delai

**Given** l'API retourne HTTP 500 ou 503
**When** le client intercepte la reponse
**Then** il reessaie avec backoff, maximum 3 tentatives (NFR8)

**Given** l'API retourne HTTP 401
**When** le client intercepte la reponse
**Then** il delegue au mecanisme de refresh token (Story 7.5) avant de reessayer

**Given** le `RateLimitManager` dans `app/connectors/rate_limit_manager.ts`
**When** il est enregistre dans le IoC container comme singleton
**Then** il verifie le budget restant avant chaque requete
**And** si le budget 15min ou journalier est epuise, il attend le prochain reset (intervalles naturels :00, :15, :30, :45)

**And** les use cases n'importent jamais directement `StravaHttpClient` — injection via IoC container

### Story 8.2 : Activity Mapper & Sport Mapper

As a **systeme**,
I want **transformer les activites Strava en seances Sporty**,
So that **les donnees importees s'integrent dans le modele existant** (FR18, FR19, FR20).

**Acceptance Criteria:**

**Given** le `StravaActivityMapper` dans `app/connectors/strava/strava_activity_mapper.ts`
**When** il recoit un objet DetailedActivity de Strava
**Then** il produit un objet compatible avec le modele Session de Sporty
**And** il mappe : name, sport_type (via sport mapper), start_date_local -> date, moving_time -> duration_minutes (conversion secondes -> minutes), distance -> distance_km (conversion metres -> km), average_heartrate -> avg_heart_rate, average_speed -> allure (conversion m/s -> min/km ou km/h)
**And** il stocke `imported_from: 'strava'` et `external_id: activity.id` (FR21)
**And** les donnees supplementaires (calories, elevation_gain, max_heartrate, device_name) sont stockees dans `sport_metrics` JSONB

**Given** le `StravaSportMapper` dans `app/connectors/strava/strava_sport_mapper.ts`
**When** il recoit un `sport_type` Strava
**Then** il mappe vers les types Sporty : Run/TrailRun/VirtualRun -> course, Ride/MountainBikeRide/GravelRide/EBikeRide/VirtualRide -> velo, Swim -> natation, Walk -> marche, Hike -> randonnee (FR19)
**And** tout sport_type non mappe retourne le type "autre" comme fallback

**Given** une activite Strava avec des donnees partielles (pas de FC, pas de distance)
**When** le mapper la traite
**Then** les champs manquants sont laisses null, l'import n'est pas bloque (FR20)

### Story 8.3 : Listing pre-import & staging

As a **utilisateur avec un connecteur Strava connecte**,
I want **voir la liste de mes seances Strava disponibles a l'import**,
So that **je peux choisir lesquelles importer** (FR7, FR29).

**Acceptance Criteria:**

**Given** mon connecteur Strava est en etat `connected`
**When** j'accede a la page Import
**Then** le systeme appelle `GET /athlete/activities` via le StravaHttpClient avec `per_page=200` et `after` = timestamp d'il y a 1 mois par defaut (FR29)
**And** les activites recuperees sont sauvegardees dans la table `import_activities` avec status `new` et `raw_data` = SummaryActivity brute
**And** la deduplication est assuree par la contrainte unique `(connector_id, external_id)` — les activites deja en staging ne sont pas ecrasees
**And** le chargement repond en moins de 5 secondes pour 1 mois de donnees (NFR1)

**Given** des activites existent deja en staging avec differents statuts
**When** la page se charge
**Then** les activites deja importees ou ignorees conservent leur statut (pas de reset)

**Given** le connecteur est en etat `error` ou `disconnected`
**When** j'accede a la page Import
**Then** un message m'invite a (re)connecter Strava, pas d'appel API

### Story 8.4 : Page Import (DataTable, filtres, badges)

As a **utilisateur connecte**,
I want **un tableau interactif de mes seances Strava avec filtres et etats visuels**,
So that **je peux parcourir, filtrer et distinguer mes seances avant de les importer** (FR8, FR9, FR10).

**Acceptance Criteria:**

**Given** j'ai des activites en staging
**When** la page Import se charge
**Then** un Shadcn DataTable (TanStack Table) affiche les colonnes : date, nom, type de sport (mappe), duree, distance, statut (FR9)
**And** chaque ligne affiche un badge colore selon le statut : bleu "Nouvelle" / vert "Importee" / gris "Ignoree" (FR10)
**And** le tableau est triable par date, type, distance

**Given** je veux filtrer par plage de dates
**When** j'utilise le selecteur de dates (date debut / date fin)
**Then** seules les activites dans la plage sont affichees (FR8)
**And** la plage par defaut est le dernier mois (FR29)

**Given** je suis sur mobile (< 768px)
**When** la page se charge
**Then** le DataTable est remplace par une vue cards (une carte par activite avec les memes infos et badges)

**Given** je suis sur desktop
**When** je navigue au clavier dans le tableau
**Then** les lignes sont focusables et selectionnables au clavier (accessibilite)

**And** les zones tactiles des badges et checkboxes font au minimum 44x44px
**And** la page est accessible via la navigation principale (lien "Import" dans le menu)

### Story 8.5 : Import en lot avec progression

As a **utilisateur connecte**,
I want **selectionner plusieurs seances et les importer en lot avec un compteur de progression**,
So that **j'importe efficacement mes seances et je suis la progression** (FR11, FR12).

**Acceptance Criteria:**

**Given** j'ai des activites en statut `new` dans le tableau
**When** je coche des checkboxes sur les lignes souhaitees
**Then** un compteur affiche le nombre de seances selectionnees et un bouton "Importer (N)" apparait (FR11)

**Given** je clique "Importer (N)"
**When** l'import demarre
**Then** le backend traite les activites sequentiellement : pour chaque activite, il appelle `GET /activities/{id}` (DetailedActivity), mappe via StravaActivityMapper, et insere en base dans une transaction isolee (import atomique)
**And** le statut de l'activite en staging passe de `new` a `imported` et `imported_session_id` est rempli
**And** un compteur de progression s'affiche cote frontend : "2/5 seances importees..." via polling `GET /import/progress` toutes les 2-3 secondes (FR12)
**And** l'import d'une seance individuelle repond en moins de 3 secondes (NFR2)

**Given** une activite echoue pendant l'import (erreur API, donnees corrompues)
**When** l'erreur est detectee
**Then** cette activite reste en statut `new` (retentable), les autres continuent (FR25)
**And** un message indique a la fin "4/5 importees, 1 en erreur"

**Given** l'import est en cours
**When** je reste sur la page
**Then** l'UI reste reactive, le compteur se met a jour en temps reel (NFR4)

**Given** l'import est termine
**When** le dernier element est traite
**Then** le tableau se rafraichit avec les nouveaux statuts (badges verts)
**And** un toast confirme "N seances importees"

### Story 8.6 : Ignorer une seance

As a **utilisateur connecte**,
I want **ignorer une seance que je ne veux pas importer**,
So that **elle ne pollue plus ma liste de seances a traiter** (FR13).

**Acceptance Criteria:**

**Given** une activite est en statut `new` dans le tableau
**When** je clique sur le bouton "Ignorer" (ou icone X) sur la ligne
**Then** le statut passe a `ignored`
**And** le badge devient gris "Ignoree"
**And** un toast confirme "Seance ignoree"

**Given** une activite est en statut `ignored`
**When** je clique sur "Restaurer" (ou icone undo)
**Then** le statut repasse a `new`
**And** le badge redevient bleu "Nouvelle"

**Given** j'ai des activites ignorees
**When** je regarde le tableau avec le filtre par defaut
**Then** les activites ignorees sont toujours visibles mais visuellement distinctes (badge gris, opacite reduite)

### Story 8.7 : Integration calendrier, stats et dashboard

As a **utilisateur connecte**,
I want **que mes seances importees apparaissent dans le calendrier, les stats et le dashboard**,
So that **les seances importees sont traitees comme n'importe quelle seance Sporty** (FR22).

**Acceptance Criteria:**

**Given** des seances ont ete importees depuis Strava
**When** je consulte la liste des seances (onglet Seances)
**Then** les seances importees apparaissent dans la liste au meme titre que les seances manuelles
**And** un indicateur subtil (icone ou label "Strava") distingue la source

**Given** des seances importees existent
**When** je consulte le dashboard (HeroMetric, QuickStatCards, graphiques)
**Then** les metriques incluent les seances importees dans les calculs (allure moyenne, volume, FC)

**Given** une seance importee existe
**When** je consulte son detail
**Then** je vois toutes les donnees mappees + la mention "Importe depuis Strava"
**And** la seance est modifiable comme une seance manuelle (les modifications sont locales, pas de sync retour)

**Given** la meme activite Strava est importee deux fois (edge case)
**When** le systeme detecte le doublon via `external_id`
**Then** l'import est ignore, pas de doublon en base

## Epic 9 : Import Automatique

L'utilisateur active l'import auto, configure l'intervalle de polling, et ses nouvelles seances apparaissent automatiquement dans Sporty.

### Story 9.1 : Settings auto import

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

### Story 9.2 : Sync scheduler (service preload)

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

### Story 9.3 : Sync connector use case

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

## Epic 10 : Resilience & Gestion d'Erreurs

Le systeme absorbe les erreurs API, gere le rate limiting intelligemment, et communique clairement les problemes a l'utilisateur. Les donnees importees sont toujours en securite.

### Story 10.1 : Affichage etat erreur connecteur

As a **utilisateur avec un connecteur en erreur**,
I want **voir clairement que mon connecteur a un probleme et pouvoir agir**,
So that **je ne suis jamais dans le doute sur l'etat de mes imports** (FR23).

**Acceptance Criteria:**

**Given** mon connecteur passe en etat `error` (token revoque, refresh echoue)
**When** je suis sur la page Connecteurs
**Then** la ConnectorCard affiche un badge orange "Erreur" avec un message explicatif ("Connexion Strava interrompue — veuillez reconnecter")
**And** un bouton "Reconnecter" est visible

**Given** mon connecteur est en etat `error`
**When** j'accede a la page Import
**Then** un bandeau d'avertissement s'affiche en haut : "Connexion Strava interrompue" avec un lien vers la page Connecteurs
**And** les activites deja en staging restent visibles (pas de suppression)
**And** le bouton "Importer" est desactive

**Given** l'API Strava est temporairement indisponible (500/503)
**When** le systeme detecte des erreurs repetees
**Then** le connecteur ne passe PAS en etat `error` (c'est temporaire)
**And** le systeme reessaie automatiquement au prochain cycle de polling

**Given** le token est invalide (401 + refresh echoue)
**When** le systeme detecte l'echec du refresh
**Then** le connecteur passe en etat `error`
**And** l'import auto est suspendu jusqu'a reconnexion

### Story 10.2 : Rate limit manager avance

As a **systeme**,
I want **gerer le rate limiting de maniere proactive avec file d'attente**,
So that **les imports massifs respectent les limites sans intervention utilisateur** (FR24).

**Acceptance Criteria:**

**Given** le `RateLimitManager` est actif
**When** le budget 15min est epuise (100 requetes non-upload atteintes)
**Then** les requetes suivantes sont mises en attente jusqu'au prochain interval naturel (:00, :15, :30, :45)
**And** un message est logue (pas affiche a l'utilisateur) indiquant l'attente

**Given** le budget journalier est epuise (1000 requetes)
**When** une requete est tentee
**Then** elle est rejetee avec un message clair cote frontend : "Limite journaliere Strava atteinte, les imports reprendront demain"
**And** le compteur de progression reflecte l'arret temporaire

**Given** un import de 50 activites est lance
**When** les requetes arrivent au seuil du budget 15min
**Then** l'import se met en pause automatiquement, attend le reset, puis reprend
**And** le compteur de progression indique "En pause — reprise dans X minutes"

**Given** une requete retourne 429
**When** le backoff exponentiel est applique
**Then** les delais sont : 1s, 2s, 4s, 8s + jitter aleatoire 0-500ms (NFR7)
**And** apres 3 echecs 429 consecutifs, la requete est abandonnee et l'activite reste en status `new`

### Story 10.3 : Isolation et securite des donnees importees

As a **utilisateur**,
I want **que mes seances deja importees restent intactes quoi qu'il arrive au connecteur**,
So that **mes donnees sont en securite independamment de l'etat de la connexion Strava** (FR26).

**Acceptance Criteria:**

**Given** j'ai 10 seances importees depuis Strava
**When** mon connecteur passe en etat `error` ou `disconnected`
**Then** les 10 seances restent intactes dans la table `sessions` — aucune suppression, aucune modification
**And** elles continuent d'apparaitre dans le calendrier, les stats et le dashboard

**Given** je deconnecte volontairement Strava
**When** le connecteur est supprime
**Then** les seances importees restent en base avec leur `imported_from = 'strava'`
**And** les entrees en staging (`import_activities`) sont nettoyees (elles n'ont plus de connecteur associe)

**Given** je reconnecte Strava apres une deconnexion
**When** le systeme fetch les activites
**Then** les activites deja importees (matchees par `external_id`) ne sont pas reimportees en doublon
**And** elles apparaissent en staging avec le statut `imported` (car la session existe deja)

**Given** une seance importee est modifiee manuellement dans Sporty
**When** la meme activite est re-fetchee depuis Strava
**Then** la modification locale est preservee (one-way snapshot — pas de sync retour)
