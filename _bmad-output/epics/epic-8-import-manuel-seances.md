# Epic 8 : Import Manuel de Seances

L'utilisateur voit ses seances Strava dans un tableau, les filtre, les selectionne et les importe en lot avec un compteur de progression. Il peut aussi ignorer des seances non pertinentes.

**FRs couverts :** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR18, FR19, FR20, FR21, FR22, FR25, FR29
**Includes :** StravaHttpClient + RateLimitManager, activity mapper + sport mapper, page Import/Index (DataTable, selection multiple, badges d'etat, vue cards mobile), import batch sequentiel + progression, integration calendrier/stats/dashboard, mapping partiel, metadonnee `imported_from`

---

## Story 8.1 : StravaHttpClient & RateLimitManager

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

---

## Story 8.2 : Activity Mapper & Sport Mapper

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

---

## Story 8.3 : Listing pre-import & staging

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

---

## Story 8.4 : Page Import (DataTable, filtres, badges)

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

---

## Story 8.5 : Import en lot avec progression

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

---

## Story 8.6 : Ignorer une seance

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

---

## Story 8.7 : Integration calendrier, stats et dashboard

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
