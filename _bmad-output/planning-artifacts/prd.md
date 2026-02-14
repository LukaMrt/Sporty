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
  - product-brief-Sporty-2026-02-13.md
  - brainstorming-session-2026-02-13.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 1
  projectDocs: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - Sporty

**Author:** Luka
**Date:** 2026-02-13

## Executive Summary

Sporty est une application sportive personnelle, self-hosted, qui unifie la saisie d'entraînement, le suivi de séances et l'analyse de progression en une seule interface simple. L'app remplace l'assemblage fragile de Strava + plans web + suivi manuel par un outil cohérent, adaptatif et entièrement sous le contrôle de l'utilisateur.

### Vision

Un outil d'entraînement intelligent, transparent et personnel — hébergé chez soi — qui planifie, analyse, s'adapte et fait progresser, tout en laissant le contrôle total à l'utilisateur.

### Différenciateurs clés

- **Self-hosted & libre** : données souveraines, aucun lock-in
- **Plans adaptatifs** (post-MVP) : le plan s'ajuste à la réalité des séances effectuées
- **Simplicité en surface, puissance en profondeur** : interface minimaliste, moteur intelligent
- **API-first** : architecture ouverte et extensible

### Utilisateurs cibles

- **Sportif connecté** (Marc, 32 ans) : frustré par l'éparpillement de ses données entre Strava, plans web et tableurs
- **Débutante motivée** (Sarah, 27 ans) : veut se mettre à la course sérieusement avec un outil qui l'accompagne sans la culpabiliser
- **Admin serveur** (Luka) : déploie et maintient l'instance pour lui et ses proches

### Contexte projet

- **Type :** Web app SPA, containerisée Docker, API-first
- **Domaine :** Fitness personnel (aucune régulation santé)
- **Complexité :** Basse
- **Contexte :** Greenfield — nouveau produit from scratch

## Success Criteria

### Succès Utilisateur

- **Moment "aha" MVP** : voir ses propres données de progression (FC, vitesse, volume) visualisées clairement — "je veux voir ce truc, je peux le voir"
- **Fluidité** : saisir une séance en moins de 30 secondes, sans friction
- **Onboarding rapide** : déploiement → premier login → première séance saisie en quelques minutes
- **Remplacement d'outils** : Sporty suffit, plus besoin de jongler entre Strava/tableurs/plans web

### Succès Business

N/A — projet personnel. Le succès = l'envie d'utiliser l'app soi-même au quotidien.

### Succès Technique

- **Déploiement ultra-simple** : un `docker-compose.yml`, quelques variables d'env, `docker compose up` et c'est parti
- **Maintenance minimale** : `docker compose pull && docker compose up -d` occasionnel, rien de plus
- **Performance** : latence acceptable pour un projet self-hosted, optimisation souhaitée mais pas critique au MVP
- **Architecture API-first** : extensible, modulaire, prête pour les futurs sports et fonctionnalités

### Outcomes Mesurables

| Indicateur                         | Cible                              |
| ---------------------------------- | ---------------------------------- |
| Séances complétées vs planifiées   | > 70%                              |
| Usage régulier                     | Stable sur 3+ mois                 |
| Outils externes encore nécessaires | 0                                  |
| Satisfaction personnelle           | "Oui, j'aime utiliser cette app"   |
| Temps onboarding                   | < 5 min (deploy → première séance) |
| Temps saisie d'une séance          | < 30 sec                           |

## User Journeys

### Journey 1 — Marc, le sportif connecté (parcours principal - succès)

**Scène d'ouverture :** Marc rentre de sa course du mardi soir. D'habitude, il ouvre Strava, note mentalement ses splits, puis va chercher son plan d'entraînement sur un Google Doc. Il se dit "il doit y avoir mieux que ça".

**Action montante :** Il déploie Sporty sur son serveur — `docker compose up`, quelques variables d'env, c'est fait. L'admin lui crée un compte. Il se connecte, renseigne son profil (course à pied, niveau intermédiaire). Il saisit sa séance du jour : 10 km, 52 min, FC moyenne 155, ressenti "bien".

**Climax :** Après deux semaines de saisie régulière, Marc ouvre son dashboard. Il voit ses courbes de FC moyenne en baisse, son allure qui s'améliore. Il zoome sur le mois. Il se dit : "Enfin, tout est au même endroit et je VOIS ma progression."

**Résolution :** Marc n'ouvre plus son Google Doc. Sporty est devenu son réflexe post-séance. Il saisit en 20 secondes et consulte ses graphiques le dimanche matin avec son café.

### Journey 2 — Sarah, la débutante motivée (parcours principal - variante)

**Scène d'ouverture :** Sarah a décidé de se mettre à courir. Elle a téléchargé 3 apps, lu 10 articles contradictoires, et ne sait toujours pas si elle progresse ou si elle se fait mal.

**Action montante :** Un ami qui héberge Sporty lui crée un compte. Elle se connecte, renseigne son profil (débutante, course à pied). Elle commence à saisir ses séances : 3 km en 25 min, FC 175, ressenti "difficile".

**Climax :** Au bout d'un mois, Sarah voit que sa FC a baissé de 175 à 160 pour la même distance. Elle comprend concrètement qu'elle progresse, même si elle ne court pas encore très vite.

**Résolution :** Sarah a arrêté de se comparer aux plans web. Elle a SES données, SA courbe. L'app ne la juge pas, elle lui montre simplement où elle en est.

### Journey 3 — L'admin serveur (parcours opérationnel)

**Scène d'ouverture :** Luka veut déployer Sporty sur son serveur personnel pour lui et quelques proches.

**Action montante :** Il clone le repo, configure son `.env` (port, base de données, secret JWT), lance `docker compose up -d`. L'app démarre, il crée le premier compte — automatiquement admin. Il crée ensuite des comptes pour Marc et Sarah.

**Climax :** Tout tourne. Il vérifie que les utilisateurs peuvent se connecter. Quelques semaines plus tard, il fait un `docker compose pull && up -d` pour mettre à jour. Zéro interruption notable.

**Résolution :** Le serveur tourne, la maintenance est quasi-inexistante. Luka peut se concentrer sur son propre entraînement.

### Journey 4 — Marc, séance ratée (edge case / erreur)

**Scène d'ouverture :** Marc saisit une séance mais se trompe — il met 5 km au lieu de 15 km.

**Action montante :** Il voit que son graphique de volume a chuté bizarrement. Il retrouve la séance dans sa liste, clique dessus.

**Climax :** Il modifie la distance, sauvegarde. Le graphique se met à jour immédiatement.

**Résolution :** Pas de friction, pas de perte de données. L'erreur se corrige aussi vite qu'elle a été faite.

### Journey Requirements Summary

| Journey           | Capabilities révélées                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Marc (succès)     | Saisie séance rapide, dashboard progression, graphiques évolution, zoom temporel, profil utilisateur      |
| Sarah (débutante) | Même socle, onboarding simple, métriques compréhensibles pour débutants, absence de jugement dans l'UX    |
| Admin serveur     | Déploiement Docker simple, création premier compte admin, gestion utilisateurs (CRUD), mise à jour facile |
| Marc (edge case)  | Édition/correction de séance, mise à jour temps réel des graphiques, liste des séances navigable          |

## Domain-Specific Requirements

### Conventions Sportives & Affichage

- Préférences utilisateur pour les unités d'affichage (km/h, min/km, ou les deux)
- Adaptation de l'affichage selon les paramètres du profil utilisateur
- Respecter les conventions du sport affiché (allure pour la course, watts pour le vélo, etc.)
- Le stockage interne peut être normalisé, l'affichage s'adapte

### Intégrité des Données

- Soft-delete sur les séances avec possibilité de visualiser et restaurer les données supprimées
- Pas d'historique de modification poussé pour le moment
- Protection contre la suppression accidentelle (confirmation avant suppression)

### Architecture Multi-Sport

- Modèle de données extensible : ajouter un nouveau sport doit générer un minimum de friction
- Chaque sport définit ses propres métriques spécifiques (allure, watts, longueurs...) tout en partageant un socle commun (durée, distance, FC, ressenti)
- L'ajout d'un sport doit s'intégrer naturellement dans toute la chaîne : saisie, import/export, analyse et planification
- Architecture plugin/modulaire pour les sports plutôt que du code en dur par sport

## Web App — Exigences Spécifiques

### Architecture Technique

- **Type :** SPA (Single Page Application) — framework frontend moderne, API backend REST
- **Rendu :** client-side rendering, pas de SSR nécessaire
- **SEO :** non pertinent (app derrière authentification)
- **Temps réel :** non requis — refresh classique pour les mises à jour de données
- **PWA :** à considérer pour un accès mobile rapide, pas prioritaire au MVP

### Support Navigateur

- Navigateurs modernes uniquement : Chrome, Firefox, Safari, Edge (dernières versions)
- Responsive design mobile/tablette souhaité mais desktop-first

### Accessibilité

- Niveau minimum raisonnable : bon contraste, navigation clavier basique, labels sur les formulaires
- Pas de conformité WCAG stricte visée

## Project Scoping & Développement Phasé

### Stratégie MVP

**Approche :** Experience MVP — le minimum pour que l'outil remplace le setup actuel (Strava + plans web + tableurs).

**Philosophie de développement :** Jalons unitaires validés séquentiellement. Chaque jalon est un checkpoint : "ça marche, je le vois, on passe à la suite". Les jalons techniques internes (non utilisables par un end-user) sont légitimes pour valider l'infra avant de construire dessus.

**Ressources :** Développeur unique, expérimenté (dev + qualité logicielle + self-hosting). Stack technique non prescrite — choix ouvert pour expérimentation.

### Phase 1 — MVP (jalons unitaires)

**MVP 0 — Squelette technique (checkpoint dev)**

- Container Docker fonctionnel (docker-compose.yml + .env)
- API REST de base
- Système d'authentification (JWT) + premier compte admin
- Gestion des utilisateurs par l'admin (CRUD)
- Modèle de données initial : utilisateur, sports, séances (extensible multi-sport)
- Interface minimale (preuve que le frontend communique avec l'API)

**MVP 1 — Saisie de séances (premier livrable utilisateur)**

- Saisie manuelle : sport, durée, distance, FC, ressenti
- Socle commun + métriques spécifiques par sport (course à pied en V1)
- Liste des séances passées (avec soft-delete + restauration)
- Édition/correction d'une séance existante
- Timeline basique

**MVP 2 — Visualisation progression (moment "aha")**

- Dashboard avec métriques clés
- Graphiques d'évolution (allure, FC, volume)
- Zoom temporel (semaine/mois)
- Unités configurables par utilisateur (km/h, min/km, ou les deux)

**Journeys supportés au MVP :** Marc (succès), Sarah (débutante), Admin serveur, Marc (edge case correction)

### Phase 2 — Growth (jalons unitaires)

- **MVP 3** — Import données : Strava API, fichiers GPX/FIT, détection auto type de séance
- **MVP 4** — Plans adaptatifs : objectifs goal-first, moteur de plan, timeline unifiée plan+historique, recalcul post-séance

### Phase 3 — Vision (jalons unitaires)

- **MVP 5** — Coaching intelligent : score readiness, feedback proactif, prévention surentraînement, zéro culpabilité
- **MVP 6** — Personnalisation complète : modes simple/expert, multi-sport unifié, export rapport, API ouverte

### Stratégie de Mitigation des Risques

**Risques techniques :**

| Risque                                   | Impact                              | Mitigation                                                                                                             |
| ---------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Modèle de données multi-sport extensible | Élevé — choix structurant dès MVP 0 | Socle commun solide + système d'extension par sport. Commencer avec course à pied, valider l'extensibilité avant MVP 3 |
| Graphiques pertinents multi-sport        | Moyen — complexité à MVP 2+         | Commencer avec des graphiques mono-sport simples, itérer sur la pertinence cross-sport plus tard                       |
| Maintenabilité / propreté du code        | Moyen — dette technique             | Expérience en qualité logicielle du développeur, approche itérative avec refactoring intégré à chaque jalon            |

**Risques ressource :**

| Risque               | Impact                | Mitigation                                                                                                                   |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Développeur unique   | Moyen — pas de backup | Jalons petits et indépendants, chaque MVP est un état stable. Pause possible entre les jalons sans perte de contexte         |
| Motivation / abandon | Moyen — projet perso  | Chaque jalon livre de la valeur visible. MVP 1 est utilisable rapidement. Le plaisir d'utiliser l'app alimente la motivation |

**Risques marché :** N/A — projet personnel, pas de validation marché nécessaire.

## Functional Requirements

### Gestion des Comptes & Authentification

- **FR1:** Le premier utilisateur créé devient automatiquement administrateur du serveur
- **FR2:** L'administrateur peut créer des comptes utilisateurs
- **FR3:** L'administrateur peut modifier et supprimer des comptes utilisateurs
- **FR4:** Un utilisateur peut se connecter à son compte via identifiant et mot de passe
- **FR5:** Un utilisateur peut se déconnecter de son compte
- **FR6:** Un utilisateur peut modifier son mot de passe

### Profil Utilisateur

- **FR7:** Un utilisateur peut renseigner son profil sportif (niveau, sport(s) pratiqué(s), objectifs)
- **FR8:** Un utilisateur peut configurer ses préférences d'affichage (unités : km/h, min/km, ou les deux)
- **FR9:** Un utilisateur peut modifier son profil et ses préférences à tout moment

### Gestion des Séances

- **FR10:** Un utilisateur peut saisir manuellement une séance avec les données du socle commun (sport, durée, distance, FC moyenne, ressenti)
- **FR11:** Un utilisateur peut saisir des métriques spécifiques au sport pratiqué lors d'une séance (ex: allure pour la course)
- **FR12:** Un utilisateur peut consulter la liste de ses séances passées
- **FR13:** Un utilisateur peut modifier une séance existante
- **FR14:** Un utilisateur peut supprimer une séance (soft-delete)
- **FR15:** Un utilisateur peut consulter ses séances supprimées
- **FR16:** Un utilisateur peut restaurer une séance supprimée
- **FR17:** Un utilisateur peut filtrer et trier ses séances (par sport, date, durée, etc.)

### Visualisation & Progression

- **FR18:** Un utilisateur peut consulter un dashboard avec ses métriques clés de progression
- **FR19:** Un utilisateur peut visualiser des graphiques d'évolution de ses données (allure, FC, volume)
- **FR20:** Un utilisateur peut zoomer sur une période temporelle (semaine, mois)
- **FR21:** Un utilisateur peut voir ses données affichées dans les unités qu'il a configurées

### Gestion des Sports

- **FR22:** Le système supporte un socle commun de données partagées par tous les sports (durée, distance, FC, ressenti)
- **FR23:** Le système supporte des métriques spécifiques par sport (extensible)
- **FR24:** Un utilisateur peut consulter ses données par sport

### Administration Serveur

- **FR25:** L'administrateur peut déployer l'application via un docker-compose.yml et des variables d'environnement
- **FR26:** L'administrateur peut mettre à jour l'application via pull + restart du container
- **FR27:** L'administrateur peut consulter la liste des utilisateurs du serveur

## Non-Functional Requirements

### Performance

- Les actions utilisateur courantes (saisie, navigation, consultation) répondent en moins de 2 secondes sur le réseau local
- Les graphiques de progression se chargent et s'affichent de manière fluide avec plusieurs mois de données (jusqu'à ~500 séances)
- L'application reste utilisable sur un serveur modeste (VPS entrée de gamme ou Raspberry Pi-class)
- Navigation intra-app fluide (SPA, pas de rechargement entre les vues)

### Sécurité

- Toutes les communications transitent en HTTPS
- Authentification JWT avec tokens à expiration
- Mots de passe hashés (jamais stockés en clair)
- Inputs utilisateur sanitisés pour prévenir les injections (SQL, XSS)
- Endpoints API protégés par authentification — aucun accès anonyme aux données
- Headers de sécurité HTTP standards (CORS, CSP, X-Frame-Options)
- Pas de chiffrement de la base de données au repos (self-hosted, confiance dans l'infra)

### Maintenabilité & Opérations

- Déploiement complet via un seul `docker-compose.yml` + fichier `.env`
- Mise à jour via `docker compose pull && docker compose up -d`
- Logs applicatifs accessibles via `docker compose logs`
- Les données persistent dans un volume Docker (pas de perte au redémarrage)
- Le schéma de base de données supporte les migrations (évolutions entre versions)
