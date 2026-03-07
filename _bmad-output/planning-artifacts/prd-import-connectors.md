---
stepsCompleted:
  [
    step-01-init,
    step-02-discovery,
    step-03-success,
    step-04-journeys,
    step-05-domain,
    step-06-innovation,
    step-07-project-type,
    step-08-scoping,
    step-09-functional,
    step-10-nonfunctional,
    step-11-polish,
  ]
inputDocuments:
  - brainstorming-session-2026-03-07.md
  - technical-api-strava-research-2026-03-07.md
  - prd.md
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 1
  projectDocs: 1
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - Sporty (Import & Connecteurs)

**Author:** Luka
**Date:** 2026-03-07

## Executive Summary

Ce PRD complementaire couvre le systeme d'import de seances sportives depuis des sources externes dans Sporty. Le premier connecteur cible est Strava, avec une architecture extensible pour accueillir Garmin, fichiers GPX/FIT/TCX et d'autres sources a l'avenir. Ce document complete le PRD principal de Sporty qui couvre le socle applicatif (comptes, seances manuelles, dashboard, deploiement).

### Vision

Reduire a zero la friction entre "je fais ma seance" et "ma seance est dans Sporty" — que ce soit par import manuel controle ou synchronisation automatique.

### Differenciateurs cles

- **One-way snapshot** : import = copie definitive, pas de sync bilaterale — simplicite architecturale
- **Extensibilite** : pattern Connector abstrait, ajouter une source = implementer une interface
- **Self-hosted compatible** : OAuth2 fonctionne en localhost, polling au lieu de webhooks
- **Controle utilisateur** : mode manuel ou auto, l'utilisateur choisit son niveau de friction

### Contexte projet

- **Type :** Extension fonctionnelle d'une web app SPA existante
- **Domaine :** Fitness personnel (aucune regulation sante)
- **Complexite :** Medium (integration API tierce, OAuth2, architecture extensible)
- **Contexte :** Brownfield — ajout au systeme Sporty existant

## Success Criteria

### Succes Utilisateur

- **Moment "aha" mode manuel** : "Je connecte Strava, je vois mes seances apparaitre, je choisis lesquelles importer" — controle total, zero friction de selection
- **Moment "aha" mode auto** : "Je fais ma seance, 15 minutes plus tard elle est dans Sporty" — la friction entre l'effort et le suivi disparait
- **Fluidite** : connecter Strava en quelques clics (OAuth redirect, pas de config technique cote utilisateur)
- **Transparence** : l'etat du connecteur est toujours visible (connecte / erreur / deconnecte), jamais de doute sur "est-ce que ca marche ?"
- **Resilience silencieuse** : les erreurs API, tokens expires, donnees partielles — tout est absorbe et communique clairement, jamais de crash ou d'etat incoherent

### Succes Business

N/A — projet personnel. Le succes = ne plus jamais avoir besoin d'ouvrir Strava pour voir ses donnees dans Sporty.

### Succes Technique

- **Extensibilite** : ajouter un nouveau connecteur (Garmin, fichiers GPX/FIT) demande un effort minimal grace au pattern Connector abstrait
- **Robustesse** : les erreurs API sont absorbees, l'affichage reflete l'etat reel, aucune corruption de donnees
- **Simplicite de configuration** : cote utilisateur, quelques clics. Cote admin, les variables d'env Strava (client_id, client_secret) et c'est tout
- **One-way snapshot** : principe architectural fort — import = copie definitive, pas de sync bidirectionnelle, ce qui simplifie tout le systeme

### Outcomes Mesurables

| Indicateur                                                          | Cible                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Temps connexion Strava (OAuth)                                      | < 30 secondes (quelques clics)                             |
| Delai apparition seance (mode auto)                                 | < 15 minutes apres l'activite                              |
| Temps pour importer une seance (mode manuel)                        | < 5 secondes (selection + clic)                            |
| Effort pour ajouter un futur connecteur                             | Interface Connector + implementation specifique uniquement |
| Erreurs visibles pour l'utilisateur en cas de probleme API          | 100% (jamais d'erreur silencieuse non communiquee)         |
| Seances Strava necessitant encore l'app Strava pour etre consultees | 0                                                          |

## User Journeys

### Journey 1 — Marc connecte Strava et importe manuellement (parcours principal - mode manuel)

**Scene d'ouverture :** Marc utilise Sporty depuis quelques semaines pour saisir ses seances manuellement. Il a 2 ans d'historique sur Strava et aimerait recuperer ses anciennes seances sans tout ressaisir.

**Action montante :** Il va dans ses parametres, voit la section "Connecteurs". Il clique "Connecter Strava". Une redirection l'emmene sur le site Strava ou il autorise l'acces en un clic. Il est redirige vers Sporty — un toast confirme "Strava connecte !" avec un spinner indiquant le chargement des seances du dernier mois.

**Climax :** Quelques secondes plus tard, la page d'import affiche ses 12 dernieres seances Strava. Il reconnait ses sorties — les noms, les dates, les distances. Il selectionne les 5 courses a pied qui l'interessent, clique "Importer". Un compteur de progression decompte : 1/5, 2/5... En quelques secondes, c'est fait.

**Resolution :** Marc ouvre son calendrier Sporty. Ses 5 seances importees sont la, avec les bonnes dates, distances et FC. Elles apparaissent dans ses graphiques de progression. Il n'a plus besoin de Strava pour voir son historique.

### Journey 2 — Sarah active l'import automatique (parcours principal - mode auto)

**Scene d'ouverture :** Sarah utilise Sporty depuis un mois. Elle enregistre ses courses avec sa montre Garmin connectee a Strava. Elle en a marre de saisir manuellement dans Sporty ce qui existe deja dans Strava.

**Action montante :** Elle va dans ses parametres, connecte Strava (meme flux OAuth que Marc). Puis elle voit l'option "Import automatique" et l'active. Un message lui explique : "Vos nouvelles seances Strava apparaitront automatiquement dans Sporty."

**Climax :** Le lendemain, Sarah fait sa course du matin. Elle rentre, prend sa douche. 15 minutes plus tard, elle ouvre Sporty : sa seance est deja la. Distance, duree, FC — tout est importe. Elle n'a rien fait.

**Resolution :** Sarah ne saisit plus jamais manuellement ses courses. Elle ouvre Sporty pour voir sa progression, pas pour saisir des donnees. La friction a disparu.

### Journey 3 — Marc, le token expire (edge case / erreur)

**Scene d'ouverture :** Marc utilise l'import manuel depuis plusieurs semaines. Un jour, il ouvre la page d'import et voit un bandeau : "Connexion Strava interrompue".

**Action montante :** Dans ses parametres, le connecteur Strava affiche l'etat "Erreur". Un bouton "Reconnecter" est visible. Il clique, est redirige vers Strava, autorise a nouveau.

**Climax :** En quelques secondes, le connecteur repasse en etat "Connecte". Ses seances deja importees n'ont pas bouge — rien n'a ete perdu.

**Resolution :** Marc comprend que les erreurs de connexion sont normales et faciles a corriger. Ses donnees importees sont en securite, independamment de l'etat du connecteur.

### Journey 4 — Luka configure les credentials Strava (parcours admin)

**Scene d'ouverture :** Luka veut activer la fonctionnalite d'import Strava sur son instance Sporty.

**Action montante :** Il va sur le portail developpeur Strava, cree une application, obtient un client_id et un client_secret. Il ajoute ces deux valeurs dans son fichier `.env` et relance le container.

**Climax :** Le bouton "Connecter Strava" apparait dans les parametres de tous les utilisateurs. Luka le teste sur son propre compte — OAuth, import, tout fonctionne.

**Resolution :** La configuration est faite une fois pour toutes. Les utilisateurs n'ont aucune config technique a faire de leur cote — juste cliquer "Connecter".

### Journey Requirements Summary

| Journey              | Capabilities revelees                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Marc (import manuel) | OAuth Strava, page connecteurs, liste pre-import, selection multiple, import en lot, progression, integration calendrier/stats |
| Sarah (import auto)  | Mode auto ON/OFF, polling arriere-plan, import transparent, zero intervention utilisateur                                      |
| Marc (token expire)  | Etat connecteur visible (connecte/erreur/deconnecte), bouton reconnecter, resilience des donnees importees                     |
| Luka (admin)         | Configuration via variables d'env, activation conditionnelle du bouton Strava, zero config cote utilisateur                    |

## Domain-Specific Requirements

### Contraintes API Strava

- Scopes OAuth requis : `read` et `activity:read_all` (lecture seule)
- Access token expire apres 6 heures — refresh automatique obligatoire
- Refresh token rotatif : persister le nouveau token avant de traiter la reponse
- Rate limiting : 100 req non-upload/15min, 1000/jour — lire les headers `X-RateLimit-Usage` apres chaque requete
- Pagination : max 200 resultats par page via `GET /athlete/activities`
- Depassement = HTTP 429 — backoff exponentiel avec jitter

### Contraintes Self-Hosted

- `localhost` whiteliste comme redirect_uri OAuth (http, pas https)
- Pas de webhooks possibles sans URL publique — polling obligatoire
- Budget API largement suffisant en mono-utilisateur (~200 syncs/jour)
- Client ID et Client Secret configures via variables d'environnement

### Securite des Tokens

- Tokens OAuth (access + refresh) stockes chiffres en base (AES-256 ou equivalent)
- Tokens jamais exposes cote frontend — le backend fait tous les appels API
- Client secret en variable d'environnement, jamais en base
- Pas de logging accidentel des tokens (masquage dans les logs d'erreur)
- Protection IDOR sur les endpoints d'import
- Refresh token persiste avant toute utilisation pour eviter la perte en cas de crash

### Mapping des Donnees

- Utiliser `sport_type` (pas `type` qui est deprecie)
- Mapping minimum : Run, Ride, Swim, Walk, Hike + type "Autre" pour les non supportes
- SummaryActivity pour la liste pre-import, DetailedActivity pour l'import complet
- Mapping partiel accepte : on importe ce qu'on a, on affiche les infos disponibles
- Unites Strava : distance en metres, temps en secondes, vitesse en m/s — conversion cote Sporty

## Web App — Exigences Specifiques

### Architecture Technique

- **Type :** Extension de la SPA existante — nouvelles routes/pages dans le frontend existant
- **Rendu :** Client-side rendering (coherent avec le socle)
- **SEO :** Non pertinent (derriere authentification)
- **Temps reel :** Non requis — polling frontend pour le compteur de progression d'import

### Nouvelles Pages

- **Page d'import** : page dediee plein ecran, accessible depuis la navigation principale
  - Tableau des seances pre-import (date, nom, type, duree, distance, source)
  - Etats visuels : nouvelle / importee / ignoree
  - Selection multiple + action "Importer" en lot
  - Selecteur de plage temporelle (defaut : 1 mois)
  - Compteur de progression pendant l'import
- **Section connecteurs dans les parametres** : gestion des connecteurs (connecter/deconnecter/etat)
  - Toggle import auto ON/OFF
  - Configuration intervalle de polling

### Support Navigateur & Accessibilite

- Memes cibles que le socle : Chrome, Firefox, Safari, Edge (dernieres versions)
- Responsive design : page d'import utilisable sur mobile (tableau adaptatif)
- Coherent avec le socle : bon contraste, navigation clavier, labels sur les formulaires
- Le tableau d'import doit etre navigable au clavier (selection, actions)

## Project Scoping & Developpement Phase

### Strategie MVP

**Approche :** Experience MVP — tout le flux d'import en un seul livrable fonctionnel. L'utilisateur connecte Strava, voit ses seances, et peut importer (manuellement ou automatiquement) en une seule livraison.

**Philosophie :** Meme approche que le PRD principal — un jalon = un checkpoint complet et utilisable. Ici, le jalon "MVP 3 — Import Strava" est auto-suffisant : une fois livre, l'import fonctionne de bout en bout.

**Ressources :** Developpeur unique (coherent avec le PRD principal).

### MVP 3 — Import Strava (jalon unique)

**Journeys supportes :** Marc (manuel), Sarah (auto), token mort (erreur), Luka (admin config)

**Must-Have :**

- OAuth2 Strava (redirect, callback, tokens, refresh automatique)
- Page connecteurs dans les parametres (connecter / deconnecter / etat visible)
- Page d'import dediee : tableau des seances pre-import, 1 mois par defaut + selecteur de plage
- 3 etats visuels par seance : nouvelle / importee / ignoree
- Import manuel : selection multiple + import en lot avec compteur de progression
- Import auto : toggle ON/OFF + polling configurable (~10-15 min)
- Mapping Strava vers modele Sporty (mapping partiel accepte)
- Metadonnee source sur chaque seance importee
- Integration dans calendrier, stats, dashboard
- Gestion erreurs : token mort -> etat erreur, invite a reconnecter
- Configuration admin : client_id + client_secret via variables d'env

### Post-MVP (Growth)

- Connecteur Garmin (meme pattern Connector)
- Connecteur fichiers (GPX/FIT/TCX) — upload manuel
- Webhooks optionnels (pour setups avec URL publique)
- Import historique etendu (> 1 mois, plage libre)

### Vision (Future)

- Detection automatique de doublons cross-sources
- Sync bidirectionnelle optionnelle
- Marketplace de connecteurs communautaires

### Strategie de Mitigation des Risques

**Risques techniques :**

| Risque                                         | Impact                                       | Mitigation                                                         |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Refresh token perdu (crash pendant le refresh) | Eleve — re-authentification obligatoire      | Persister le nouveau refresh token avant de traiter la reponse     |
| Import massif (>1000 activites)                | Moyen — multi-jours a cause du rate limiting | Limiter a 1 mois par defaut, selecteur de plage pour l'utilisateur |
| Nouveaux sport_types Strava                    | Faible — mapping incomplet                   | Type "Autre" comme fallback, mapping evolutif                      |
| API Strava indisponible                        | Faible — temporaire                          | Backoff exponentiel, etat erreur visible, retry automatique        |

**Risques ressource :**

| Risque             | Impact                                  | Mitigation                                           |
| ------------------ | --------------------------------------- | ---------------------------------------------------- |
| Developpeur unique | Moyen — pas de backup                   | Jalon unique et auto-suffisant, livrable en une fois |
| Complexite OAuth2  | Moyen — premiere integration API tierce | Recherche technique deja faite, flux bien documente  |

## Functional Requirements

### Gestion des Connecteurs

- **FR1:** Un utilisateur peut connecter un compte Strava via OAuth2 depuis ses parametres
- **FR2:** Un utilisateur peut deconnecter un connecteur Strava depuis ses parametres
- **FR3:** Un utilisateur peut consulter l'etat de son connecteur (connecte / erreur / deconnecte)
- **FR4:** Un utilisateur peut reconnecter un connecteur en etat d'erreur
- **FR5:** Le systeme rafraichit automatiquement les tokens OAuth expires
- **FR6:** Le systeme persiste le nouveau refresh token avant de traiter toute reponse API

### Import Manuel

- **FR7:** Un utilisateur peut consulter la liste de ses seances Strava non importees
- **FR8:** Un utilisateur peut filtrer les seances pre-import par plage de dates
- **FR9:** Un utilisateur peut voir les details d'une seance pre-import (date, nom, type, duree, distance)
- **FR10:** Un utilisateur peut distinguer visuellement les seances nouvelles, importees et ignorees
- **FR11:** Un utilisateur peut selectionner plusieurs seances pour un import en lot
- **FR12:** Un utilisateur peut suivre la progression d'un import en lot
- **FR13:** Un utilisateur peut ignorer une seance (la marquer comme non pertinente)

### Import Automatique

- **FR14:** Un utilisateur peut activer ou desactiver l'import automatique
- **FR15:** Un utilisateur peut configurer l'intervalle de polling
- **FR16:** Le systeme recupere automatiquement les nouvelles seances Strava selon l'intervalle configure
- **FR17:** Le systeme importe automatiquement les nouvelles seances detectees quand l'import auto est actif

### Mapping & Integration des Donnees

- **FR18:** Le systeme mappe les activites Strava vers le modele de seance Sporty
- **FR19:** Le systeme mappe les sport_types Strava vers les types de sport Sporty
- **FR20:** Le systeme importe les donnees disponibles meme si le mapping est partiel
- **FR21:** Le systeme conserve la metadonnee source (ex: importedFrom: strava) sur chaque seance importee
- **FR22:** Les seances importees sont integrees dans le calendrier, les stats et le dashboard

### Gestion des Erreurs & Resilience

- **FR23:** Le systeme affiche l'etat d'erreur du connecteur quand le token est invalide ou l'API indisponible
- **FR24:** Le systeme gere le rate limiting Strava (backoff, file d'attente)
- **FR25:** Le systeme gere les activites avec des donnees incompletes sans bloquer l'import
- **FR26:** Les seances deja importees ne sont pas affectees par une deconnexion ou une erreur du connecteur

### Configuration Admin

- **FR27:** L'administrateur peut configurer les credentials Strava (client_id, client_secret) via variables d'environnement
- **FR28:** Le bouton "Connecter Strava" n'apparait que si les credentials admin sont configures
- **FR29:** La plage temporelle par defaut pour la liste pre-import est de 1 mois

## Non-Functional Requirements

### Performance

- Le chargement de la liste pre-import (1 mois de seances) repond en moins de 5 secondes
- L'import d'une seance individuelle (recuperation DetailedActivity + sauvegarde) repond en moins de 3 secondes
- Le polling en arriere-plan ne degrade pas les performances de l'interface utilisateur
- L'application reste reactive pendant un import en lot (pas de blocage de l'UI)

### Integration

- L'integration respecte les rate limits Strava (100 req/15min, 1000/jour non-upload)
- Les headers de rate limiting (`X-RateLimit-Usage`) sont lus apres chaque requete
- En cas de HTTP 429, backoff exponentiel avec jitter (1s, 2s, 4s, 8s + random 0-500ms)
- En cas d'erreur serveur Strava (500/503), retry avec backoff, max 3 tentatives
- En cas de HTTP 401, tentative de refresh token avant de marquer le connecteur en erreur
- L'architecture suit le pattern Connector pour permettre l'ajout de futures sources avec un effort minimal
