---
stepsCompleted: [1, 2, 3]
inputDocuments: ['brainstorming-session-2026-03-07.md']
workflowType: 'research'
lastStep: 3
workflow_completed: true
research_type: 'technical'
research_topic: 'API Strava - état des lieux technique pour import de séances sportives'
research_goals: 'Cartographier les capacités et contraintes de l''API Strava (OAuth2, endpoints, rate limiting, modèle de données, contraintes self-hosted) pour alimenter un PRD d''import de séances dans Sporty'
user_name: 'Luka'
date: '2026-03-07'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-07
**Author:** Luka
**Research Type:** technical

---

## Resume executif

Cette recherche technique cartographie les capacites et contraintes de l'API Strava v3 pour l'import de seances sportives dans Sporty (self-hosted). Les conclusions cles sont :

1. **L'API Strava est mature et stable** — REST/JSON, OAuth2, documentation complete, pas de breaking changes recents
2. **OAuth2 fonctionne en self-hosted** — localhost est whiteliste comme redirect_uri
3. **Les webhooks sont incompatibles avec le self-hosted** — polling obligatoire (10-15min)
4. **Le rate limiting est non-problematique en mono-utilisateur** — 1000 req/jour suffit largement
5. **Le modele de donnees est riche** — SummaryActivity pour la liste, DetailedActivity pour l'import complet
6. **L'architecture extensible est viable** — le pattern Connector abstrait les specificites Strava pour accueillir Garmin/fichiers plus tard
7. **Le refresh token rotatif necessite une gestion rigoureuse** — persister avant de traiter

**Risques identifies** : import massif (>1000 activites) = multi-jours ; refresh token perdu = re-authentification ; nouveaux sport_types Strava = mapping a maintenir.

---

## Technical Research Scope Confirmation

**Research Topic:** API Strava - etat des lieux technique pour import de seances sportives
**Research Goals:** Cartographier les capacites et contraintes de l'API Strava (OAuth2, endpoints, rate limiting, modele de donnees, contraintes self-hosted) pour alimenter un PRD d'import de seances dans Sporty

**Technical Research Scope:**

- OAuth2 & Authentification - flux d'autorisation, scopes, gestion des tokens
- Endpoints & modele de donnees - donnees recuperables par activite, formats, champs
- Rate limiting - limites concretes, strategies de gestion
- Contraintes self-hosted - OAuth callback sans URL publique, alternatives
- Integration & architecture - patterns d'integration, polling vs webhooks, bonnes pratiques

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-07

## Technology Stack Analysis

### Vue d'ensemble de l'API Strava

L'API Strava v3 est une API RESTful qui permet aux applications tierces d'acceder aux donnees d'activites sportives des athletes Strava. Elle utilise OAuth2 pour l'authentification, retourne du JSON, et suit les conventions REST classiques.

- **Protocole** : HTTPS REST (JSON)
- **Base URL** : `https://www.strava.com/api/v3/`
- **Authentification** : OAuth 2.0
- **Documentation officielle** : https://developers.strava.com/docs/reference/
- **Playground interactif** : https://developers.strava.com/playground/

_Source: [Strava API Documentation](https://developers.strava.com/docs/reference/)_

### OAuth2 : Flux d'authentification

#### Flux d'autorisation

1. L'application redirige l'utilisateur vers `https://www.strava.com/oauth/authorize` avec les parametres : `client_id`, `redirect_uri`, `response_type=code`, `scope`
2. L'utilisateur autorise (ou refuse) l'acces sur le site Strava
3. Strava redirige vers le `redirect_uri` de l'application avec un `code` d'autorisation
4. L'application echange le code via `POST https://www.strava.com/oauth/token` (avec `client_id`, `client_secret`, `code`) pour obtenir un **access token** et un **refresh token**

#### Scopes disponibles

| Scope               | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `read`              | Lire les donnees publiques de l'athlete                 |
| `read_all`          | Lire toutes les donnees de l'athlete (privees incluses) |
| `profile:read_all`  | Lire le profil complet                                  |
| `profile:write`     | Modifier le profil                                      |
| `activity:read`     | Lire les activites publiques                            |
| `activity:read_all` | Lire toutes les activites (y compris "Only Me")         |
| `activity:write`    | Creer et modifier des activites                         |

**Pour Sporty** : les scopes `read` et `activity:read_all` suffisent pour l'import de seances.

#### Gestion des tokens

| Propriete          | Valeur                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Access token**   | Expire apres **6 heures** (21 600 secondes)                                                                                    |
| **Refresh token**  | **N'expire jamais** sauf utilisation ou revocation explicite                                                                   |
| **Renouvellement** | `POST /oauth/token` avec `grant_type=refresh_token` retourne un nouveau couple access + refresh token                          |
| **Revocation**     | `POST https://www.strava.com/oauth/deauthorize` avec l'access token — invalide tous les tokens de l'athlete pour l'application |

**Point important** : A chaque refresh, un nouveau refresh token est retourne. L'application doit toujours persister et utiliser le refresh token le plus recent.

_Source: [Strava Authentication](https://developers.strava.com/docs/authentication/), [Refresh Token Duration](https://communityhub.strava.com/developers-api-7/how-long-does-a-refresh-token-last-3038)_

### Endpoints principaux pour l'import d'activites

#### Lister les activites de l'athlete connecte

`GET /athlete/activities`

| Parametre  | Type            | Description                                     |
| ---------- | --------------- | ----------------------------------------------- |
| `before`   | integer (epoch) | Activites avant ce timestamp                    |
| `after`    | integer (epoch) | Activites apres ce timestamp                    |
| `page`     | integer         | Numero de page (defaut : 1)                     |
| `per_page` | integer         | Resultats par page (defaut : 30, **max : 200**) |

Retourne un tableau de **SummaryActivity**.

#### Obtenir le detail d'une activite

`GET /activities/{id}`

Retourne un objet **DetailedActivity** avec l'ensemble des champs detailles.

#### Obtenir les zones d'une activite

`GET /activities/{id}/zones`

Retourne les zones de frequence cardiaque et de puissance pour une activite donnee (appel separe du detail).

#### Obtenir les laps d'une activite

`GET /activities/{id}/laps`

Retourne les segments/tours d'une activite.

_Source: [Strava API Reference](https://developers.strava.com/docs/reference/), [ActivitiesApi](https://github.com/sshevlyagin/strava-api-v3.1/blob/master/docs/ActivitiesApi.md)_

### Modele de donnees : champs d'une activite

#### SummaryActivity (retourne par la liste)

| Champ                  | Type     | Description                                       |
| ---------------------- | -------- | ------------------------------------------------- |
| `id`                   | long     | Identifiant unique                                |
| `name`                 | string   | Nom de l'activite                                 |
| `sport_type`           | string   | Type de sport (champ prefere, remplace `type`)    |
| `type`                 | string   | Type d'activite (deprecie)                        |
| `start_date`           | datetime | Date/heure de debut (UTC)                         |
| `start_date_local`     | datetime | Date/heure locale                                 |
| `timezone`             | string   | Fuseau horaire                                    |
| `distance`             | float    | Distance en **metres**                            |
| `moving_time`          | integer  | Temps en mouvement en **secondes**                |
| `elapsed_time`         | integer  | Temps total en **secondes**                       |
| `total_elevation_gain` | float    | Denivele positif en metres                        |
| `average_speed`        | float    | Vitesse moyenne (m/s)                             |
| `max_speed`            | float    | Vitesse max (m/s)                                 |
| `has_heartrate`        | boolean  | Donnees de FC disponibles                         |
| `average_heartrate`    | float    | FC moyenne (si disponible)                        |
| `max_heartrate`        | float    | FC max (si disponible)                            |
| `kilojoules`           | float    | Energie depensee (velo avec capteur de puissance) |
| `map`                  | object   | Polyline resumee du parcours                      |
| `device_name`          | string   | Nom de l'appareil                                 |

#### DetailedActivity (champs supplementaires)

Inclut tous les champs de SummaryActivity plus :
- `description` : description textuelle
- `calories` : estimation calorique
- `gear` : equipement utilise
- `splits_metric` / `splits_standard` : decoupages par km/mile
- `laps` : segments de l'activite
- `best_efforts` : meilleurs efforts sur distances standards
- `segment_efforts` : efforts sur les segments Strava
- `photos` : photos associees
- `device_watts` : si les watts viennent d'un capteur
- `weighted_average_watts`, `average_watts`, `max_watts` : donnees de puissance

**Note** : Les donnees de FC ne sont presentes que si l'activite a ete enregistree avec un capteur cardio. Le champ `has_heartrate` permet de le verifier.

_Source: [Strava API Reference](https://developers.strava.com/docs/reference/), [Stravalib Model](https://stravalib.readthedocs.io/en/v1.6/reference/strava_model.html), [DetailedActivity](https://github.com/sshevlyagin/strava-api-v3.1/blob/master/docs/DetailedActivity.md)_

### Types d'activites (sport_type)

Le champ `sport_type` (prefere) supporte les valeurs suivantes :

**Endurance** : Run, TrailRun, VirtualRun, Walk, Hike, Ride, MountainBikeRide, GravelRide, EBikeRide, VirtualRide, Velomobile, Swim

**Sports d'hiver** : AlpineSki, BackcountrySki, NordicSki, Snowboard, Snowshoe, IceSkate

**Sports nautiques** : Canoeing, Kayaking, Rowing, Sail, StandUpPaddling, Surfing, Kitesurf, Windsurf

**Fitness** : Crossfit, Elliptical, StairStepper, WeightTraining, Workout, Yoga

**Autres** : Golf, Handcycle, InlineSkate, RockClimbing, RollerSki, Skateboard, Soccer, Wheelchair

**Point Sporty** : le mapping vers les types Sporty devra couvrir au minimum Run, Ride, Swim, Walk, Hike et un type "Autre" pour les activites non supportees.

_Source: [Supported Sport Types](https://support.strava.com/hc/en-us/articles/216919407-Supported-Sport-Types-on-Strava), [Strava API Reference](https://developers.strava.com/docs/reference/)_

### Rate Limiting

| Limite                      | Valeur         |
| --------------------------- | -------------- |
| **15 minutes (overall)**    | 200 requetes   |
| **15 minutes (non-upload)** | 100 requetes   |
| **Journalier (overall)**    | 2 000 requetes |
| **Journalier (non-upload)** | 1 000 requetes |

**Mecanismes** :
- Reset des limites 15min aux intervalles naturels : :00, :15, :30, :45
- Reset journalier a **minuit UTC**
- Depassement = reponse **429 Too Many Requests** (JSON)
- Augmentation possible sur demande aupres de Strava (processus d'approbation)

**Impact pour Sporty** :
- Import initial de 1200 activites = au minimum 6 appels de liste (200/page) + 1200 appels de detail = ~1206 requetes
- Avec la limite de 1000 req non-upload/jour, un import massif prendra **plus d'une journee**
- Strategie recommandee : lister d'abord (peu de requetes), puis recuperer les details a la demande ou en arriere-plan avec respect des limites

_Source: [Rate Limits](https://developers.strava.com/docs/rate-limits/), [Rate Limit Community](https://communityhub.strava.com/developers-knowledge-base-14/rate-limits-3201)_

### Webhook Events API

| Propriete      | Valeur                                                                                  |
| -------------- | --------------------------------------------------------------------------------------- |
| **Endpoint**   | `POST https://www.strava.com/api/v3/push_subscriptions`                                 |
| **Limite**     | 1 subscription par application                                                          |
| **Evenements** | Creation, suppression, modification d'activite ; revocation d'acces athlete             |
| **Validation** | Strava envoie un GET avec `hub.challenge` au callback_url — doit retourner le challenge |
| **Livraison**  | POST au callback_url avec `object_type`, `aspect_type`, `object_id`                     |
| **Timeout**    | Le callback doit repondre 200 OK en **moins de 2 secondes**                             |

**Contenu d'un event webhook** :
- `object_type` : "activity" ou "athlete"
- `aspect_type` : "create", "update", "delete"
- `object_id` : ID de l'activite ou de l'athlete
- `owner_id` : ID de l'athlete proprietaire
- `subscription_id` : ID de la subscription
- `event_time` : timestamp de l'evenement

**Point Sporty (self-hosted)** : Les webhooks necessitent une URL publique accessible par Strava. En contexte self-hosted sans URL publique, le polling reste la seule option viable.

_Source: [Webhook Events API](https://developers.strava.com/docs/webhooks/), [Webhook Example](https://developers.strava.com/docs/webhookexample/)_

### Contraintes self-hosted & OAuth

| Aspect                           | Support                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| **localhost comme redirect_uri** | Oui — `localhost` et `127.0.0.1` sont whitelistes                               |
| **Format**                       | `http://localhost:<port>` (http, pas https)                                     |
| **Webhooks depuis localhost**    | Non — pas de callbacks vers localhost                                           |
| **Appels API apres auth**        | Oui — aucune restriction de domaine sur les appels API une fois le token obtenu |

**Implications pour Sporty self-hosted** :
1. **OAuth fonctionne** : l'utilisateur est redirige vers Strava, autorise, puis redirige vers `http://localhost:<port>/callback` — compatible self-hosted
2. **Pas de webhooks** : sans URL publique, impossible de recevoir les push events — **polling obligatoire**
3. **Appels API OK** : une fois le token obtenu, toutes les requetes API fonctionnent depuis n'importe quel environnement

**Alternative pour les webhooks** : utiliser un service de tunneling (ngrok, Cloudflare Tunnel) ou un proxy cloud leger — mais cela ajoute de la complexite pour l'utilisateur self-hosted. Le polling avec intervalle configurable (10-15min comme decide dans le brainstorming) est la solution la plus simple.

_Source: [Testing Locally](https://communityhub.strava.com/developers-api-7/testing-strava-application-locally-1714), [Strava Authentication](https://developers.strava.com/docs/authentication/)_

### Tendances et evolution de l'API

- Le champ `sport_type` remplace `type` (deprecie mais toujours present)
- Ajout recent de `device_name` dans SummaryActivity
- Strava ajoute regulierement de nouveaux sport types (5 nouveaux en fevrier 2026)
- L'API v3 est stable depuis plusieurs annees, pas de v4 annoncee
- Pas de breaking changes majeurs recents, l'API est mature

_Niveau de confiance : eleve — base sur la documentation officielle et le changelog_

_Source: [Strava Changelog](https://developers.strava.com/docs/changelog/), [Strava Press](https://press.strava.com/en-gb/articles/strava-adds-five-new-sports-to-enable-more-comprehensive-activity-tracking)_

## Integration Patterns Analysis

### Pattern d'integration recommande pour Sporty

L'integration de l'API Strava dans Sporty suit un pattern **"One-Way Snapshot via Connector"** : un connecteur isole gere l'authentification, la recuperation et la transformation des donnees Strava en seances Sporty.

#### Architecture du connecteur

```
[Strava API] <--OAuth2/REST--> [StravaConnector] --transform--> [Sporty Session Model]
                                     |
                              [Token Store]
                              [Sync State]
```

**Composants cles** :
- **StravaConnector** : encapsule toute la logique specifique a Strava (auth, appels API, mapping)
- **Token Store** : stockage securise des tokens OAuth (access + refresh)
- **Sync State** : suivi de l'etat de synchronisation (dernier sync, activites traitees)
- **Activity Mapper** : transformation SummaryActivity/DetailedActivity → modele Sporty

_Niveau de confiance : eleve — pattern standard pour les integrations API tierces_

### Securite des tokens OAuth

| Pratique                   | Recommandation                                                     |
| -------------------------- | ------------------------------------------------------------------ |
| **Stockage access token**  | En base, chiffre (AES-256 ou equivalent)                           |
| **Stockage refresh token** | En base, chiffre — ne doit jamais quitter le backend               |
| **Client secret**          | Variable d'environnement, jamais en base ni en frontend            |
| **Rotation**               | Persister systematiquement le dernier refresh token recu           |
| **Frontend**               | Tokens jamais exposes cote client — le backend fait les appels API |
| **Logs**                   | Ne jamais logger les tokens — masquer dans les logs d'erreur       |

**Point cle** : Le refresh token Strava est invalide des qu'un nouveau est emis. Si l'application rate la mise a jour du refresh token (crash, erreur reseau), l'utilisateur devra se re-authentifier.

_Source: [Strava Authentication](https://developers.strava.com/docs/authentication/), [Token Migration](https://code.dblock.org/2018/11/17/dealing-with-strava-api-token-migration.html)_

### Strategie de polling et synchronisation

#### Pourquoi le polling (et pas les webhooks) pour Sporty self-hosted

- Les webhooks Strava necessitent une **URL publique accessible** pour recevoir les callbacks
- En self-hosted (localhost), pas de callback possible → **polling obligatoire**
- Alternative webhook : tunneling (ngrok, Cloudflare Tunnel) — trop complexe pour l'utilisateur moyen

#### Strategie de polling recommandee

**Import initial (premiere connexion)** :
1. Lister les activites avec `GET /athlete/activities?after={timestamp}&per_page=200`
2. Limiter a 1 mois par defaut (configurable par l'utilisateur)
3. Stocker les SummaryActivity en local (peu de requetes)
4. Recuperer les DetailedActivity a la demande (quand l'utilisateur clique "importer")

**Sync reguliere (apres connexion)** :
1. Polling toutes les 10-15 min quand l'application est active
2. Utiliser le parametre `after` avec le timestamp de la derniere activite connue
3. Ne recuperer que les nouvelles activites
4. Budget API : ~4-6 requetes par sync (1 liste + quelques details)

#### Budget API par scenario

| Scenario                                 | Requetes                      | Duree estimee                        |
| ---------------------------------------- | ----------------------------- | ------------------------------------ |
| Sync reguliere (0-5 nouvelles activites) | 1-6                           | Instantane                           |
| Import 1 mois (~30 activites)            | 1 (liste) + 30 (details) = 31 | Quelques secondes                    |
| Import 3 mois (~90 activites)            | 1 + 90 = 91                   | < 1 minute                           |
| Import 1 an (~365 activites)             | 2 + 365 = 367                 | ~5 minutes (avec respect rate limit) |
| Import 3 ans (~1000 activites)           | 5 + 1000 = 1005               | **Multi-jours** (limite 1000/jour)   |

_Source: [Rate Limits](https://developers.strava.com/docs/rate-limits/), [Fetching Activities](https://communityhub.strava.com/developers-api-7/fetching-activities-within-rate-limit-1693), [Avoid Rate Limit](https://communityhub.strava.com/developers-api-7/how-to-avoid-rate-limit-11118)_

### Gestion des rate limits

#### Headers de reponse

Chaque reponse de l'API Strava inclut des headers de rate limit :

| Header                  | Format            | Exemple    |
| ----------------------- | ----------------- | ---------- |
| `X-RateLimit-Limit`     | `{15min},{daily}` | `100,1000` |
| `X-RateLimit-Usage`     | `{15min},{daily}` | `34,527`   |
| `X-ReadRateLimit-Limit` | `{15min},{daily}` | `100,1000` |
| `X-ReadRateLimit-Usage` | `{15min},{daily}` | `34,527`   |

**Attention** : les headers peuvent etre en minuscules (`x-ratelimit-limit`) — gerer les deux casses.

#### Strategie de gestion

1. **Lire les headers** apres chaque requete pour connaitre le budget restant
2. **Avant chaque batch** : verifier qu'il reste assez de budget pour les requetes prevues
3. **Si 429** : les requetes bloquees ne comptent pas dans le budget — attendre le prochain interval de 15min
4. **Backoff exponentiel** avec jitter pour les retries : 1s, 2s, 4s, 8s (+ random 0-500ms)
5. **File d'attente** : si le budget est epuise, mettre les requetes en queue et reprendre au prochain reset

_Source: [Rate Limits](https://developers.strava.com/docs/rate-limits/), [Rate Limit Headers](https://communityhub.strava.com/developers-knowledge-base-14/rate-limits-3201)_

### Gestion des erreurs API

| Code HTTP   | Signification           | Action recommandee                                                        |
| ----------- | ----------------------- | ------------------------------------------------------------------------- |
| **200**     | OK                      | Traiter la reponse                                                        |
| **401**     | Token expire ou revoque | Tenter un refresh token. Si echec, marquer le connecteur en etat "erreur" |
| **403**     | Scope insuffisant       | Inviter l'utilisateur a re-autoriser avec les bons scopes                 |
| **404**     | Activite introuvable    | Ignorer (supprimee cote Strava)                                           |
| **429**     | Rate limit depasse      | Backoff exponentiel, attendre le reset 15min                              |
| **500/503** | Erreur serveur Strava   | Retry avec backoff, max 3 tentatives                                      |

**Principe** : les erreurs ne doivent jamais corrompre les donnees deja importees. Chaque import est atomique par activite.

### Pattern extensible pour futurs connecteurs

Pour preparer l'ajout futur de Garmin, fichiers GPX/FIT/TCX, etc. :

```
Interface Connector {
  - authenticate() → gere l'auth specifique a la source
  - listActivities(filters) → retourne une liste d'activites normalisees
  - getActivityDetail(id) → retourne le detail d'une activite
  - getConnectionStatus() → "connected" | "error" | "disconnected"
  - disconnect() → revoque l'acces et nettoie les tokens
}

StravaConnector implements Connector
GarminConnector implements Connector  (futur)
FileConnector implements Connector    (futur - GPX/FIT/TCX)
```

**Points de comparaison Strava vs Garmin** :
- Garmin utilise aussi OAuth2 mais propose **Ping/Pull** ou **Push** comme architecture
- Garmin offre les donnees en formats FIT, GPX, TCX
- Le pattern Connector abstrait ces differences derriere une interface uniforme

_Source: [Garmin Activity API](https://developer.garmin.com/gc-developer-program/activity-api/), [Strava API](https://developers.strava.com/docs/reference/)_

### Scalabilite avec nombre d'utilisateurs (self-hosted)

| Nb utilisateurs | Budget/utilisateur/jour | Syncs possibles/jour |
| --------------- | ----------------------- | -------------------- |
| 1 (self-hosted) | 1000 requetes           | ~200 syncs           |
| 10              | 100 requetes            | ~20 syncs            |
| 50              | 20 requetes             | ~4 syncs             |
| 100             | 10 requetes             | ~2 syncs             |

**Pour Sporty self-hosted** : avec 1 seul utilisateur, le budget est largement suffisant. Le rate limiting ne devient un probleme qu'en multi-utilisateurs (SaaS), ce qui n'est pas le cas d'usage principal.

_Source: [Rate Limits](https://developers.strava.com/docs/rate-limits/), [Scaling Strava Integration](https://communityhub.strava.com/developers-api-7/how-to-avoid-rate-limit-11118)_
