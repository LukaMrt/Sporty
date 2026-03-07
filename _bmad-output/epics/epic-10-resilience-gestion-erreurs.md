# Epic 10 : Resilience & Gestion d'Erreurs

Le systeme absorbe les erreurs API, gere le rate limiting intelligemment, et communique clairement les problemes a l'utilisateur. Les donnees importees sont toujours en securite.

**FRs couverts :** FR23, FR24, FR26
**Includes :** State machine erreur connecteur avec affichage, rate limit manager avance (file d'attente, backoff), isolation donnees importees

---

## Story 10.1 : Affichage etat erreur connecteur

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

---

## Story 10.2 : Rate limit manager avance

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

---

## Story 10.3 : Isolation et securite des donnees importees

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
