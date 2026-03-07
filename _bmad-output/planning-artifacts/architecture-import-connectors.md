---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-07'
inputDocuments:
  - prd-import-connectors.md
  - technical-api-strava-research-2026-03-07.md
  - architecture.md
workflowType: 'architecture'
project_name: 'Sporty — Import & Connecteurs'
user_name: 'Luka'
date: '2026-03-07'
parentArchitecture: 'architecture.md'
---

# Architecture Decision Document — Import & Connecteurs

_Ce document est un addendum architectural au document principal `architecture.md`. Il couvre les decisions architecturales specifiques au systeme d'import de seances depuis des sources externes (Strava, puis Garmin, fichiers GPX/FIT/TCX). Toutes les decisions du document parent restent en vigueur sauf mention contraire._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (29 FRs en 5 categories + config admin) :**

| Categorie                         | FRs | Implications architecturales                                                                                   |
| --------------------------------- | --- | -------------------------------------------------------------------------------------------------------------- |
| Gestion des connecteurs (FR1-FR6) | 6   | OAuth2 flow complet, token store chiffre, refresh automatique, state machine connecteur                        |
| Import manuel (FR7-FR13)          | 7   | Page dediee, listing pre-import (SummaryActivity), selection multiple, progression batch, etat par activite    |
| Import automatique (FR14-FR17)    | 4   | Background job / scheduler, polling configurable, sync state persiste                                          |
| Mapping & integration (FR18-FR22) | 5   | Activity mapper (Strava vers Sporty), mapping sport_types, metadonnee source, integration dashboard existant   |
| Erreurs & resilience (FR23-FR26)  | 4   | State machine erreur connecteur, rate limit manager, import atomique par activite, isolation donnees importees |
| Configuration admin (FR27-FR29)   | 3   | Activation conditionnelle via env, plage par defaut configurable                                               |

**Non-Functional Requirements :**

| Categorie       | Exigences                                                               | Impact architectural                                  |
| --------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Performance     | Liste pre-import < 5s, import unitaire < 3s, UI non bloquee             | Async batch import, polling frontend pour progression |
| Integration API | Rate limits Strava (100/15min, 1000/jour), backoff exponentiel + jitter | Rate limit manager dedie, file d'attente de requetes  |
| Securite        | Tokens chiffres AES-256, jamais exposes frontend, client_secret en env  | Couche encryption, backend-only API calls             |

### Scale & Complexity

- **Domaine principal :** Extension full-stack (backend-heavy : OAuth, polling, mapping)
- **Niveau de complexite :** Moyenne — integration API tierce OAuth2, pattern bien documente
- **Composants architecturaux estimes :** ~6-8 (connector interface, strava connector, token store, sync scheduler, activity mapper, rate limiter, import page, settings connectors section)

### Technical Constraints & Dependencies

- **Architecture parent :** Toutes les decisions du document `architecture.md` s'appliquent (Clean Architecture, AdonisJS v6, Inertia + React, PostgreSQL, Shadcn/ui)
- **API Strava v3 :** REST/JSON, OAuth2, rate limiting strict, pas de webhooks en self-hosted
- **Self-hosted :** localhost whiteliste pour OAuth redirect_uri (http, pas https), polling obligatoire (pas de webhooks)
- **One-way snapshot :** Import = copie definitive, pas de sync bidirectionnelle — principe architectural fort
- **Tokens OAuth :** Access token expire apres 6h, refresh token rotatif (persister avant d'utiliser)
- **Rate limiting Strava :** 100 req non-upload/15min, 1000/jour — budget largement suffisant en mono-utilisateur

### Cross-Cutting Concerns

1. **Rate limiting** — Traverse tous les appels API Strava, impacte l'import manuel ET auto
2. **Token lifecycle** — Refresh automatique avant chaque batch, persist-before-use, encryption at rest
3. **Error recovery** — Token mort -> etat erreur -> reconnecter. Erreur API -> backoff -> retry. Import partiel -> donnees safe
4. **Activation conditionnelle** — Le feature entier n'existe que si les credentials admin sont configures en env (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET)
5. **Integration transparente** — Les seances importees s'integrent dans le calendrier, stats et dashboard existants via la metadonnee `importedFrom`
6. **Extensibilite connecteurs** — Pattern Connector abstrait pour accueillir Garmin, fichiers GPX/FIT/TCX sans refactoring

## Starter Template Evaluation

### Contexte Brownfield

Ce projet est une extension du socle Sporty existant. Le starter template (AdonisJS Inertia React) est deja en place. Cette section identifie les besoins techniques nouveaux non couverts par le socle.

### Nouvelles Dependances Techniques

| Besoin                    | Solution socle existante | Gap a combler                                                     |
| ------------------------- | ------------------------ | ----------------------------------------------------------------- |
| OAuth2 client             | Aucune                   | Flow OAuth2 complet (redirect, callback, token exchange, refresh) |
| Chiffrement tokens        | Aucune                   | AES-256-GCM pour access + refresh tokens en base                  |
| Background jobs / polling | Aucune                   | Scheduler pour polling automatique Strava                         |
| HTTP client API externe   | fetch natif Node.js      | Client HTTP avec retry, backoff, rate limit tracking              |
| Rate limit management     | Aucune                   | Tracking budget API, file d'attente, backoff exponentiel          |

### Decisions Starter Reportees a l'Etape 4

Les choix specifiques (librairies, patterns d'implementation) pour chaque gap sont traites dans les decisions architecturales ci-dessous.

## Core Architectural Decisions

### Decision Priority Analysis

**Decisions Critiques (bloquent l'implementation) :**

| Decision                 | Choix                                                                                                 | Rationale                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Modele connecteur        | Table `connectors` avec contrainte unique `(user_id, provider)`, enums PG pour `provider` et `status` | Un connecteur par source par utilisateur, etats types             |
| Staging pre-import       | Table `import_activities` avec `raw_data` JSONB, enum statut `new`/`imported`/`ignored`               | Persiste l'etat "ignore", evite le re-fetch                       |
| Evolution sessions       | Colonnes `imported_from` et `external_id` (nullables) sur table `sessions`                            | Tracabilite source, deduplication                                 |
| Chiffrement tokens       | AES-256-GCM via `node:crypto`, transparent dans le modele Lucid (getter/setter)                       | Zero dependance, encryption at rest, invisible pour les use cases |
| Cle de chiffrement       | Variable d'env `CONNECTOR_ENCRYPTION_KEY` (32 bytes hex), fail-fast si absente                        | Securite non optionnelle                                          |
| OAuth CSRF               | Parametre `state` aleatoire stocke en session, verifie au callback                                    | Protection standard OAuth2                                        |
| HTTP client Strava       | `fetch` natif Node.js + wrapper `StravaHttpClient` custom                                             | Zero dependance, controle total, ~50 lignes                       |
| Rate limit manager       | Service en memoire, lit `X-RateLimit-Usage`, backoff exponentiel + jitter                             | Pas de persistence necessaire (reset 15min)                       |
| Import batch progression | Etat en memoire serveur, polling frontend `GET /import/progress` toutes les 2-3s                      | Simple, pas de WebSocket, coherent avec le socle                  |
| Background polling       | Service AdonisJS preload, `setInterval` par connecteur actif, cleanup au shutdown                     | Zero dependance, zero container supplementaire                    |
| OAuth redirect_uri       | Construit depuis `APP_URL` en env, compatible reverse proxy via `trustProxy`                          | Fonctionne en localhost et en prod derriere proxy                 |

**Decisions Importantes (faconnent l'architecture) :**

| Decision         | Choix                                                                      | Rationale                                  |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| Tableau d'import | Shadcn DataTable (TanStack Table), badges d'etat colores, vue cards mobile | Composant owned, selection multiple native |
| Routes           | Intentionnelles, prefixees `/connectors` et `/import`                      | Coherent avec le socle                     |
| Tokens frontend  | Jamais exposes — le frontend ne voit que status/provider/lastSyncAt        | Securite by design                         |

**Decisions Differees (post-MVP) :**

| Decision                          | Raison du report                                            |
| --------------------------------- | ----------------------------------------------------------- |
| Webhooks Strava                   | Necessite URL publique, incompatible self-hosted par defaut |
| Connecteur Garmin                 | Meme pattern Connector, implementation future               |
| Connecteur fichiers (GPX/FIT/TCX) | Upload manuel, pattern different                            |

### Data Architecture

**Nouvelles tables :**

**Table `connectors` :**
- `id`, `user_id` (FK users), `provider` (enum: `strava`, extensible), `status` (enum: `connected`/`error`/`disconnected`)
- `encrypted_access_token`, `encrypted_refresh_token`, `token_expires_at`
- `auto_import_enabled` (boolean), `polling_interval_minutes` (integer)
- `last_sync_at` (timestamp nullable)
- Contrainte unique : `(user_id, provider)`

**Table `import_activities` :**
- `id`, `connector_id` (FK connectors), `external_id` (ID activite Strava)
- `status` (enum: `new`/`imported`/`ignored`)
- `raw_data` (JSONB — SummaryActivity brute de Strava)
- `imported_session_id` (FK sessions, nullable — rempli apres import)
- Contrainte unique : `(connector_id, external_id)` (deduplication)

**Evolution table `sessions` :**
- Ajout colonne `imported_from` (nullable, ex: `strava`)
- Ajout colonne `external_id` (nullable, ID activite source pour deduplication)

### Authentication & Security

**Chiffrement tokens OAuth :**
- AES-256-GCM via `node:crypto` natif
- Transparent dans le modele Lucid `Connector` via custom getter/setter
- Cle derivee de `CONNECTOR_ENCRYPTION_KEY` (variable d'env obligatoire)
- IV unique par operation de chiffrement, stocke avec le ciphertext

**OAuth2 flow :**
- Parametre `state` aleatoire genere et stocke en session avant la redirection
- Verifie au callback pour proteger contre les attaques CSRF
- Callback route protegee par le middleware `auth` existant
- `redirect_uri` construit dynamiquement depuis `APP_URL`

**Tokens cote frontend :**
- Jamais exposes dans les props Inertia
- Le frontend ne voit que : `provider`, `status`, `lastSyncAt`, `autoImportEnabled`, `pollingIntervalMinutes`

### API & Communication Patterns

**HTTP Client Strava (`StravaHttpClient`) :**
- Wrapper autour de `fetch` natif Node.js
- Interceptors : token refresh automatique (si 401), retry avec backoff (si 429/500/503)
- Rate limit tracking via lecture des headers `X-RateLimit-Usage` (gestion casse insensible)
- Max 3 retries pour les erreurs serveur

**Rate Limit Manager :**
- Service en memoire (singleton via IoC container)
- Compteurs 15min et journalier mis a jour apres chaque reponse
- Verification du budget avant chaque requete
- Si budget epuise : attente jusqu'au prochain reset (intervalles naturels :00, :15, :30, :45)
- Backoff exponentiel avec jitter pour les 429 : 1s, 2s, 4s, 8s + random 0-500ms

**Import batch :**
- Import sequentiel activite par activite (respect rate limit)
- Etat de progression en memoire serveur (map `userId -> { total, completed, current }`)
- Frontend poll `GET /import/progress` toutes les 2-3 secondes pendant l'import
- Pas de WebSocket/SSE — coherent avec le principe "pas de temps reel" du socle

**Routes intentionnelles :**

| Route                           | Methode | Intention                                        |
| ------------------------------- | ------- | ------------------------------------------------ |
| `/connectors`                   | GET     | Page settings connecteurs                        |
| `/connectors/strava/authorize`  | GET     | Lancer le flow OAuth Strava                      |
| `/connectors/strava/callback`   | GET     | Callback OAuth (redirect Strava)                 |
| `/connectors/strava/disconnect` | POST    | Deconnecter Strava                               |
| `/connectors/strava/settings`   | POST    | Mettre a jour settings (auto import, intervalle) |
| `/import`                       | GET     | Page d'import (liste pre-import)                 |
| `/import/activities`            | GET     | Fetch activites Strava (avec filtres dates)      |
| `/import/activities`            | POST    | Importer les activites selectionnees             |
| `/import/activities/:id/ignore` | POST    | Ignorer une activite                             |
| `/import/progress`              | GET     | Etat de progression d'un import en cours         |

### Frontend Architecture

**Nouvelles pages :**
- `pages/Connectors/Index.tsx` — section settings connecteurs (etat, boutons connecter/deconnecter, toggle auto import)
- `pages/Import/Index.tsx` — page d'import plein ecran avec tableau

**Tableau d'import :**
- Shadcn DataTable base sur TanStack Table
- Selection multiple, tri par date/type/distance
- Badges colores par etat : nouvelle (bleu) / importee (vert) / ignoree (gris)
- Responsive mobile : vue cards au lieu du tableau sur petits ecrans

**Polling progression :**
- `useEffect` + `setInterval` (2-3s) pendant un import actif
- Cleanup au demontage du composant
- Affichage compteur : "3/5 seances importees..."

### Infrastructure & Deployment

**Background polling (import auto) :**
- Service AdonisJS enregistre comme preload via provider
- Hook `ready` : charge les connecteurs avec `auto_import_enabled = true`, lance `setInterval` par connecteur
- Hook `shutdown` : cleanup propre de tous les intervals
- Docker `restart: unless-stopped` garantit la reprise apres crash

**Variables d'environnement nouvelles :**

| Variable                   | Description                                          | Obligatoire                        |
| -------------------------- | ---------------------------------------------------- | ---------------------------------- |
| `STRAVA_CLIENT_ID`         | Client ID de l'app Strava                            | Non — feature desactivee si absent |
| `STRAVA_CLIENT_SECRET`     | Client Secret de l'app Strava                        | Non — feature desactivee si absent |
| `CONNECTOR_ENCRYPTION_KEY` | Cle AES-256 pour chiffrement tokens (32 bytes hex)   | Oui si connecteurs actifs          |
| `APP_URL`                  | URL publique de l'instance (pour redirect_uri OAuth) | Oui                                |

**Docker Compose :** Aucun changement — memes 2 containers (app + db). Les nouvelles tables sont ajoutees via migrations Lucid.

### Decision Impact Analysis

**Sequence d'implementation recommandee :**

1. Migrations DB (tables `connectors`, `import_activities`, evolution `sessions`)
2. Modeles Lucid + chiffrement tokens (getter/setter)
3. Domain : interface Connector, entites, value objects, errors
4. Infrastructure : `StravaHttpClient`, `RateLimitManager`, `TokenEncryption`
5. Use cases : OAuth flow (authorize, callback, disconnect, refresh)
6. Use cases : listing pre-import, import manuel, ignore
7. Use cases : import auto (polling scheduler)
8. Controllers + routes intentionnelles
9. Frontend : page connecteurs (settings)
10. Frontend : page import (tableau, progression)

**Dependances inter-decisions :**

- Chiffrement tokens -> necessaire avant tout stockage de tokens OAuth
- `StravaHttpClient` -> depend du `RateLimitManager`
- Import auto -> depend de l'import manuel (memes use cases, declenchement different)
- Frontend import -> depend des routes API backend
- `APP_URL` -> necessaire pour le flow OAuth (redirect_uri)

## Implementation Patterns & Consistency Rules

### Naming Patterns (complements au socle)

**Nouveaux fichiers backend :**
- Connecteurs : `app/connectors/` — snake_case (convention AdonisJS)
- Interface abstraite : `connector.ts` (pas `connector_interface.ts` — le dossier `interfaces/` suffit)
- Implementation : `strava_connector.ts`, `garmin_connector.ts`
- Services infra : `strava_http_client.ts`, `rate_limit_manager.ts`, `token_encryption.ts`

**Enums PostgreSQL :**
- Nommage : snake_case, singulier : `connector_provider`, `connector_status`, `import_activity_status`
- Valeurs : lowercase sans underscore : `strava`, `garmin`, `connected`, `error`, `disconnected`, `new`, `imported`, `ignored`

**Colonnes chiffrees :**
- Prefixe `encrypted_` en base : `encrypted_access_token`, `encrypted_refresh_token`
- Proprietes Lucid sans prefixe (le getter/setter gere la transparence) : `accessToken`, `refreshToken`

### Structure Patterns

**Organisation des connecteurs dans Clean Architecture :**

```
app/
├── domain/
│   ├── interfaces/
│   │   └── connector.ts           # Interface abstraite Connector
│   └── errors/
│       ├── connector_auth_error.ts
│       └── rate_limit_exceeded_error.ts
├── use_cases/
│   └── connectors/
│       ├── authorize_connector.ts
│       ├── handle_oauth_callback.ts
│       ├── disconnect_connector.ts
│       ├── update_connector_settings.ts
│       ├── list_import_activities.ts
│       ├── import_activities.ts
│       ├── ignore_activity.ts
│       └── sync_connector.ts       # Polling auto
├── connectors/                     # Implementations (infra)
│   ├── strava/
│   │   ├── strava_connector.ts
│   │   ├── strava_http_client.ts
│   │   ├── strava_activity_mapper.ts
│   │   └── strava_sport_mapper.ts
│   └── rate_limit_manager.ts       # Partage entre connecteurs
├── services/
│   ├── token_encryption.ts
│   └── sync_scheduler.ts           # Preload service
├── controllers/
│   ├── connectors/
│   │   └── strava_connector_controller.ts
│   └── import/
│       └── import_controller.ts
├── models/
│   ├── connector.ts
│   └── import_activity.ts
└── validators/
    └── connectors/
        └── update_connector_settings_validator.ts
```

**Regle cle :** `app/connectors/` est de l'**infrastructure** (comme `app/repositories/`). Les use cases dependent de l'interface `domain/interfaces/connector.ts`, jamais directement de `strava_connector.ts`.

### Process Patterns

**Token refresh — pattern persist-before-use :**

1. Appel API Strava -> 401
2. `POST /oauth/token` (refresh)
3. Persister nouveau refresh_token en base AVANT de continuer
4. Retry l'appel original avec le nouveau access_token
5. Si le refresh echoue -> `status = 'error'`, arreter

**Import atomique par activite :**
- Chaque activite est importee dans sa propre transaction
- Si une activite echoue, les autres continuent
- L'activite en erreur reste en statut `new` (retentable)

**Mapping sport_type Strava -> Sporty :**
- Map explicite dans `strava_sport_mapper.ts`
- Tout type non mappe -> fallback `other`
- Le mapper est un simple objet cle/valeur, pas de logique complexe

### Enforcement Rules (complements au socle)

**Tout agent AI DOIT :**

1. Utiliser l'interface `Connector` du domain, jamais l'implementation Strava directement dans les use cases
2. Chiffrer les tokens via le modele Lucid (getter/setter), jamais d'encryption manuelle dans les use cases
3. Passer par le `RateLimitManager` pour tout appel API Strava
4. Persister le refresh token AVANT de l'utiliser (persist-before-use)
5. Traiter chaque import d'activite comme atomique (transaction isolee)
6. Utiliser les enums PostgreSQL pour `provider`, `status`, `import_activity_status`

**Anti-patterns interdits :**

- Appel direct a l'API Strava sans passer par `StravaHttpClient`
- Stockage de tokens en clair en base
- Import batch dans une seule transaction (tout ou rien)
- Logique specifique Strava dans un use case (doit vivre dans `connectors/strava/`)
- Exposition de tokens ou de `raw_data` dans les props Inertia

**Dependency-cruiser — regles de frontieres :**

Les regles de dependances architecturales doivent etre appliquees via dependency-cruiser :

- `app/domain/` ne peut importer depuis aucun autre dossier `app/` (zero dependance framework)
- `app/use_cases/` peut importer depuis `app/domain/` uniquement (pas depuis `app/connectors/`, `app/models/`, `app/controllers/`)
- `app/connectors/` peut importer depuis `app/domain/` (interfaces) et librairies externes uniquement
- `app/controllers/` peut importer depuis `app/use_cases/` et `app/validators/` uniquement
- `app/connectors/strava/` ne doit jamais etre importe directement par `app/use_cases/` — injection via IoC container
- Ces regles completent les regles existantes du socle et doivent etre ajoutees a la configuration `.dependency-cruiser.cjs`

## Project Structure & Boundaries

### Complete Project Directory Structure (ajouts connecteurs)

```
app/
├── connectors/                           # Infrastructure — implementations specifiques
│   ├── strava/
│   │   ├── strava_connector.ts           # Implements Connector interface
│   │   ├── strava_http_client.ts         # Wrapper fetch + retry + rate limit
│   │   ├── strava_activity_mapper.ts     # SummaryActivity/DetailedActivity -> Sporty Session
│   │   └── strava_sport_mapper.ts        # sport_type Strava -> type Sporty
│   └── rate_limit_manager.ts             # Partage entre connecteurs (singleton IoC)
├── controllers/
│   ├── connectors/
│   │   └── strava_connector_controller.ts  # OAuth authorize, callback, disconnect, settings
│   └── import/
│       └── import_controller.ts            # List, import, ignore, progress
├── domain/
│   ├── interfaces/
│   │   └── connector.ts                  # Interface abstraite Connector (port)
│   ├── entities/
│   │   └── import_activity.ts            # Entite domain import activity
│   ├── value_objects/
│   │   └── connector_status.ts           # Value object status connecteur
│   └── errors/
│       ├── connector_auth_error.ts
│       ├── connector_not_found_error.ts
│       └── rate_limit_exceeded_error.ts
├── use_cases/
│   └── connectors/
│       ├── authorize_connector.ts        # Genere l'URL OAuth + state
│       ├── handle_oauth_callback.ts      # Echange code -> tokens, cree connecteur
│       ├── disconnect_connector.ts       # Revoque + supprime tokens
│       ├── update_connector_settings.ts  # Auto import, intervalle
│       ├── list_import_activities.ts     # Fetch + liste staging
│       ├── import_activities.ts          # Import batch avec progression
│       ├── ignore_activity.ts            # Marque comme ignored
│       └── sync_connector.ts             # Logique de sync auto (appele par scheduler)
├── services/
│   ├── token_encryption.ts              # AES-256-GCM encrypt/decrypt
│   └── sync_scheduler.ts               # Preload service — setInterval par connecteur
├── models/
│   ├── connector.ts                     # Modele Lucid + getter/setter chiffrement
│   └── import_activity.ts              # Modele Lucid staging
└── validators/
    └── connectors/
        └── update_connector_settings_validator.ts

database/
└── migrations/
    ├── xxxx_create_connectors_table.ts
    ├── xxxx_create_import_activities_table.ts
    └── xxxx_add_import_fields_to_sessions_table.ts

inertia/
├── pages/
│   ├── Connectors/
│   │   └── Index.tsx                    # Settings connecteurs
│   └── Import/
│       └── Index.tsx                    # Page import plein ecran
├── components/
│   └── shared/
│       ├── ConnectorCard.tsx            # Carte etat connecteur (connected/error/disconnected)
│       ├── ImportActivityRow.tsx        # Ligne tableau import
│       └── ImportProgress.tsx           # Compteur progression import
└── hooks/
    └── use_import_progress.ts           # Hook polling progression

tests/
├── unit/
│   ├── use_cases/
│   │   ├── authorize_connector.spec.ts
│   │   ├── handle_oauth_callback.spec.ts
│   │   ├── import_activities.spec.ts
│   │   └── sync_connector.spec.ts
│   └── domain/
│       └── connector_status.spec.ts
└── functional/
    ├── connectors/
    │   ├── oauth_flow.spec.ts
    │   ├── disconnect.spec.ts
    │   └── settings.spec.ts
    └── import/
        ├── list_activities.spec.ts
        ├── import_activities.spec.ts
        └── ignore_activity.spec.ts
```

### Architectural Boundaries

**Flux de donnees (import d'une seance) :**

```
Browser -> "Connecter Strava"
  -> Controller (authorize) -> Use Case (authorize_connector)
    -> Genere URL OAuth + state en session
  <- Redirect vers Strava

Strava -> Callback redirect
  -> Controller (callback) -> Use Case (handle_oauth_callback)
    -> Echange code -> tokens via StravaHttpClient
    -> Persiste tokens chiffres via modele Connector
  <- Redirect vers /connectors (toast "Strava connecte")

Browser -> "Voir seances a importer"
  -> Controller (list) -> Use Case (list_import_activities)
    -> Connector interface -> StravaConnector -> StravaHttpClient
      -> GET /athlete/activities (via RateLimitManager)
    -> Sauvegarde en staging (import_activities)
  <- inertia.render('Import/Index', { activities })

Browser -> "Importer selection"
  -> Controller (import) -> Use Case (import_activities)
    -> Pour chaque activite (sequentiel) :
      -> Connector -> StravaHttpClient -> GET /activities/{id}
      -> ActivityMapper -> Session Sporty
      -> Repository -> INSERT sessions + UPDATE import_activities
      -> Mise a jour progression en memoire
  <- Redirect avec flash success
```

**Regles de dependances (depcruise) :**

```
domain/interfaces/connector.ts    <- use_cases/connectors/*
                                  <- connectors/strava/*

connectors/strava/*               <- services/sync_scheduler.ts (via IoC)
                                  INTERDIT <- use_cases/* (injection IoC uniquement)

services/token_encryption.ts      <- models/connector.ts (getter/setter)
                                  INTERDIT <- use_cases/*, controllers/*

rate_limit_manager.ts             <- connectors/strava/strava_http_client.ts
                                  INTERDIT <- use_cases/*, controllers/*
```

### Requirements to Structure Mapping

| FR                                 | Use Cases                                                              | Controllers                   | Pages              |
| ---------------------------------- | ---------------------------------------------------------------------- | ----------------------------- | ------------------ |
| FR1-FR4 (OAuth connect/disconnect) | `authorize_connector`, `handle_oauth_callback`, `disconnect_connector` | `strava_connector_controller` | `Connectors/Index` |
| FR5-FR6 (token refresh)            | Transparent dans `StravaHttpClient`                                    | —                             | —                  |
| FR7-FR13 (import manuel)           | `list_import_activities`, `import_activities`, `ignore_activity`       | `import_controller`           | `Import/Index`     |
| FR14-FR17 (import auto)            | `sync_connector`, `update_connector_settings`                          | `strava_connector_controller` | `Connectors/Index` |
| FR18-FR22 (mapping)                | `strava_activity_mapper`, `strava_sport_mapper`                        | —                             | —                  |
| FR23-FR26 (erreurs)                | Transversal (StravaHttpClient, RateLimitManager, domain errors)        | —                             | —                  |
| FR27-FR29 (admin config)           | Activation conditionnelle via env                                      | —                             | —                  |

| Concern transversal       | Localisation                                                                      |
| ------------------------- | --------------------------------------------------------------------------------- |
| Rate limiting             | `connectors/rate_limit_manager.ts` + `strava_http_client.ts`                      |
| Token lifecycle           | `services/token_encryption.ts` + `models/connector.ts` + `strava_http_client.ts`  |
| Activation conditionnelle | `start/env.ts` (validation) + controller (check env before render)                |
| Extensibilite connecteurs | `domain/interfaces/connector.ts` + `app/connectors/` (nouveau dossier par source) |

## Architecture Validation Results

### Coherence Validation

**Compatibilite des decisions :**
- Stack inchangee (AdonisJS + Inertia + React + PostgreSQL) — zero risque de conflit
- `node:crypto` natif — compatible Node.js 18+ (deja utilise par AdonisJS)
- `fetch` natif — compatible Node.js 18+ (pas de dependance supplementaire)
- Enums PostgreSQL — supportes nativement par Lucid via `raw` dans les migrations
- Service preload AdonisJS — pattern documente et supporte par le framework

**Coherence des patterns :**
- Clean Architecture respectee : domain -> use cases -> infra (connecteurs) — meme flux que le socle
- Nommage coherent : snake_case backend, PascalCase composants, camelCase props — identique au socle
- Routes intentionnelles coherentes avec les use cases (1 route = 1 intention)
- Dependency-cruiser couvre les nouvelles frontieres (`app/connectors/` = infra)

**Alignement structure :**
- Les nouveaux dossiers s'integrent dans l'arborescence existante sans conflit
- `app/connectors/` est au meme niveau que `app/repositories/` (infra)
- Les pages frontend suivent le pattern existant (`pages/Connectors/`, `pages/Import/`)

### Requirements Coverage

**29/29 FRs couverts :**

| FR                             | Support architectural                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| FR1-FR4 (OAuth)                | `authorize_connector` + `handle_oauth_callback` + `disconnect_connector` + state machine status |
| FR5-FR6 (token refresh)        | `StravaHttpClient` interceptor 401 + persist-before-use dans modele Lucid                       |
| FR7-FR9 (liste pre-import)     | `list_import_activities` + staging table + filtres dates                                        |
| FR10 (etats visuels)           | Enum `new`/`imported`/`ignored` + badges colores DataTable                                      |
| FR11-FR12 (import batch)       | `import_activities` sequentiel + progression en memoire + polling frontend                      |
| FR13 (ignorer)                 | `ignore_activity` + enum `ignored`                                                              |
| FR14-FR15 (auto import config) | `update_connector_settings` + `auto_import_enabled` + `polling_interval_minutes`                |
| FR16-FR17 (polling auto)       | `sync_scheduler` preload + `sync_connector` use case                                            |
| FR18-FR20 (mapping)            | `strava_activity_mapper` + `strava_sport_mapper` + mapping partiel accepte                      |
| FR21 (metadonnee source)       | Colonne `imported_from` sur sessions                                                            |
| FR22 (integration dashboard)   | Seances importees = seances normales (meme table, meme modele)                                  |
| FR23 (etat erreur)             | Enum `status = 'error'` + affichage dans `ConnectorCard`                                        |
| FR24 (rate limiting)           | `RateLimitManager` + backoff + jitter                                                           |
| FR25 (donnees incompletes)     | Mapping partiel accepte, import atomique par activite                                           |
| FR26 (isolation donnees)       | One-way snapshot, seances importees independantes du connecteur                                 |
| FR27-FR28 (config admin)       | Variables d'env, activation conditionnelle                                                      |
| FR29 (plage defaut)            | Parametre par defaut 1 mois dans `list_import_activities`                                       |

**Non-Functional Requirements :**
- Performance < 5s liste : fetch Strava pagine (max 200/page), 1 mois = ~1 requete
- Performance < 3s import unitaire : 1 requete detail + 1 insert = rapide
- UI non bloquee : import sequentiel backend, polling frontend asynchrone
- Rate limits respectes : `RateLimitManager` + headers `X-RateLimit-Usage`
- Securite tokens : AES-256-GCM, jamais exposes frontend

### Implementation Readiness

**Decisions :** 11 critiques + 3 importantes, toutes documentees avec rationale
**Structure :** Arborescence complete, tous fichiers identifies
**Patterns :** Nommage, process (persist-before-use, import atomique), enforcement rules
**Anti-patterns :** Explicitement listes et interdits
**Dependency-cruiser :** Regles de frontieres definies

### Gap Analysis

**Gaps critiques :** Aucun

**Gaps importants (non bloquants) :**

1. **Tests du `StravaHttpClient` avec mocks** — Comment mocker l'API Strava dans les tests fonctionnels. Suggestion : intercepteur `fetch` dans les tests (ou test helper dedie). A resoudre a l'implementation.
2. **Format exact du ciphertext** — Le format `iv:ciphertext:authTag` doit etre specifie pour que tous les agents produisent le meme format. Format retenu : `base64(iv):base64(ciphertext):base64(authTag)` separes par `:`.

**Gaps nice-to-have (post-MVP) :**
- Page UX design specifique pour les connecteurs (pas de UX spec dediee chargee)
- Metriques de monitoring (nombre d'imports/jour, taux d'erreur API)
- Tests E2E du flow OAuth complet

### Architecture Completeness Checklist

**Analyse des exigences**
- [x] Contexte projet analyse (29 FRs, NFRs, contraintes API Strava)
- [x] Complexite evaluee (moyenne)
- [x] Contraintes techniques identifiees (OAuth, rate limiting, self-hosted, one-way snapshot)
- [x] Concerns transversaux cartographies (6)

**Decisions architecturales**
- [x] Decisions critiques documentees avec rationale
- [x] Stack : pas de nouvelle dependance externe (node:crypto, fetch natif)
- [x] Patterns d'integration definis (Connector interface, StravaHttpClient, RateLimitManager)
- [x] Securite adressee (AES-256-GCM, state CSRF, tokens jamais exposes)

**Patterns d'implementation**
- [x] Conventions de nommage etablies (enums, colonnes chiffrees, fichiers)
- [x] Patterns de structure definis (app/connectors/ = infra)
- [x] Process patterns documentes (persist-before-use, import atomique)
- [x] Enforcement rules et anti-patterns definis
- [x] Regles dependency-cruiser pour les nouvelles frontieres

**Structure projet**
- [x] Arborescence complete definie (ajouts au socle)
- [x] Frontieres de composants etablies (depcruise)
- [x] Mapping FR -> structure complet
- [x] Flux de donnees documente (OAuth + import)

### Architecture Readiness Assessment

**Statut : PRET POUR L'IMPLEMENTATION**

**Niveau de confiance : Eleve**

**Forces :**
- Zero nouvelle dependance externe — node:crypto et fetch natifs suffisent
- Clean Architecture rigoureuse avec frontieres depcruise
- Pattern Connector extensible pour futurs connecteurs (Garmin, fichiers)
- Securite tokens solide (AES-256-GCM, persist-before-use, jamais exposes frontend)
- Integration transparente dans le socle existant (meme table sessions, meme dashboard)
- One-way snapshot simplifie massivement l'architecture (pas de sync bidirectionnelle)

**Axes d'amelioration futurs :**
- Webhooks Strava (si URL publique disponible)
- Connecteur Garmin (meme pattern)
- Connecteur fichiers GPX/FIT/TCX (upload)
- Detection de doublons cross-sources
- UX spec dediee pour les pages import/connecteurs

### Implementation Handoff

**Directives pour agents AI :**
- Suivre toutes les decisions architecturales exactement comme documentees
- Respecter les enforcement rules et anti-patterns interdits
- Utiliser les patterns d'implementation de maniere coherente
- Respecter les regles dependency-cruiser pour les frontieres
- Consulter ce document ET le document parent `architecture.md` pour toute question architecturale

**Premiere priorite d'implementation :**

1. Migrations DB (tables `connectors`, `import_activities`, colonnes `imported_from`/`external_id` sur sessions)
2. Modele Lucid `Connector` avec getter/setter chiffrement AES-256-GCM
3. Interface `Connector` dans le domain
