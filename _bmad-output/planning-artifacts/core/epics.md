---
stepsCompleted:
  [
    step-01-validate-prerequisites,
    step-02-design-epics,
    step-03-create-stories,
    step-04-final-validation,
  ]
status: complete
completedAt: '2026-02-14'
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Sporty - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Sporty, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Gestion des Comptes & Authentification**

- FR1: Le premier utilisateur cree devient automatiquement administrateur du serveur
- FR2: L'administrateur peut creer des comptes utilisateurs
- FR3: L'administrateur peut modifier et supprimer des comptes utilisateurs
- FR4: Un utilisateur peut se connecter a son compte via identifiant et mot de passe
- FR5: Un utilisateur peut se deconnecter de son compte
- FR6: Un utilisateur peut modifier son mot de passe

**Profil Utilisateur**

- FR7: Un utilisateur peut renseigner son profil sportif (niveau, sport(s) pratique(s), objectifs)
- FR8: Un utilisateur peut configurer ses preferences d'affichage (unites : km/h, min/km, ou les deux)
- FR9: Un utilisateur peut modifier son profil et ses preferences a tout moment

**Gestion des Seances**

- FR10: Un utilisateur peut saisir manuellement une seance avec les donnees du socle commun (sport, duree, distance, FC moyenne, ressenti)
- FR11: Un utilisateur peut saisir des metriques specifiques au sport pratique lors d'une seance (ex: allure pour la course)
- FR12: Un utilisateur peut consulter la liste de ses seances passees
- FR13: Un utilisateur peut modifier une seance existante
- FR14: Un utilisateur peut supprimer une seance (soft-delete)
- FR15: Un utilisateur peut consulter ses seances supprimees
- FR16: Un utilisateur peut restaurer une seance supprimee
- FR17: Un utilisateur peut filtrer et trier ses seances (par sport, date, duree, etc.)

**Visualisation & Progression**

- FR18: Un utilisateur peut consulter un dashboard avec ses metriques cles de progression
- FR19: Un utilisateur peut visualiser des graphiques d'evolution de ses donnees (allure, FC, volume)
- FR20: Un utilisateur peut zoomer sur une periode temporelle (semaine, mois)
- FR21: Un utilisateur peut voir ses donnees affichees dans les unites qu'il a configurees

**Gestion des Sports**

- FR22: Le systeme supporte un socle commun de donnees partagees par tous les sports (duree, distance, FC, ressenti)
- FR23: Le systeme supporte des metriques specifiques par sport (extensible)
- FR24: Un utilisateur peut consulter ses donnees par sport

**Administration Serveur**

- FR25: L'administrateur peut deployer l'application via un docker-compose.yml et des variables d'environnement
- FR26: L'administrateur peut mettre a jour l'application via pull + restart du container
- FR27: L'administrateur peut consulter la liste des utilisateurs du serveur

### NonFunctional Requirements

**Performance**

- NFR1: Les actions utilisateur courantes (saisie, navigation, consultation) repondent en moins de 2 secondes sur le reseau local
- NFR2: Les graphiques de progression se chargent et s'affichent de maniere fluide avec plusieurs mois de donnees (jusqu'a ~500 seances)
- NFR3: L'application reste utilisable sur un serveur modeste (VPS entree de gamme ou Raspberry Pi-class)
- NFR4: Navigation intra-app fluide (SPA, pas de rechargement entre les vues)

**Securite**

- NFR5: Toutes les communications transitent en HTTPS
- NFR6: Authentification sessions cookie-based avec CSRF integre (Inertia)
- NFR7: Mots de passe hashes argon2 (jamais stockes en clair)
- NFR8: Inputs utilisateur sanitises pour prevenir les injections (SQL, XSS)
- NFR9: Endpoints API proteges par authentification — aucun acces anonyme aux donnees
- NFR10: Headers de securite HTTP standards (CORS, CSP, X-Frame-Options)
- NFR11: Pas de chiffrement de la base de donnees au repos (self-hosted, confiance dans l'infra)

**Maintenabilite & Operations**

- NFR12: Deploiement complet via un seul docker-compose.yml + fichier .env
- NFR13: Mise a jour via docker compose pull && docker compose up -d
- NFR14: Logs applicatifs accessibles via docker compose logs
- NFR15: Les donnees persistent dans un volume Docker (pas de perte au redemarrage)
- NFR16: Le schema de base de donnees supporte les migrations (evolutions entre versions)

### Additional Requirements

**Architecture**

- Starter template : AdonisJS Inertia Starter Kit (React) — `pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr`
- Clean Architecture : controllers minces -> use cases -> domain -> repositories
- Colonne JSONB `sport_metrics` pour extensibilite multi-sport, validation dans le domain
- CI/CD GitHub Actions (lint, format, build, Docker push)
- Politique "warnings as errors" sur tous les outils des le jour 1 (ESLint --max-warnings 0, TypeScript strict)
- Shadcn/ui (Radix + Tailwind CSS) pour le design system
- Recharts pour les graphiques
- pnpm comme package manager
- 2 containers Docker (app + db PostgreSQL)
- Sessions cookie-based via AdonisJS guards (pas de JWT pour Inertia)
- Champ `role` sur User (`admin` | `user`), premier inscrit = admin
- Routes intentionnelles semantiques (POST /sessions/log, POST /sessions/:id/restore, etc.)
- State local React + props Inertia (pas de store global)

**UX**

- Mobile-first, desktop-enriched
- Direction design : Hybride D1+D2+D5, Variante B (hero compact + quick stats + timeline unifiee)
- Bottom tab bar mobile (4 onglets : Accueil / Seances / Planning / Profil)
- Sidebar navigation sur desktop (remplace bottom tab)
- FAB flottant "+" pour saisie rapide (mobile)
- Bottom sheet (mobile) / modale (desktop) pour la saisie de seance
- Onboarding wizard 4 etapes (sport, niveau, objectif, preferences)
- Composants custom : HeroMetric, QuickStatCard, TimelineItem, TimelineDivider, SparklineChart, SessionForm, SessionDetail, EmptyState, FAB
- Police system native, unite de base 4px
- Palette sobre : accent bleu, pas de rouge pour les echecs (gris neutre ou orange doux)
- Progressive disclosure (champs secondaires replies sous "Plus de details")
- Zones tactiles minimum 44x44px, contraste WCAG AA (4.5:1)

### FR Coverage Map

| FR   | Epic   | Description                        |
| ---- | ------ | ---------------------------------- |
| FR1  | Epic 2 | Premier inscrit = admin            |
| FR2  | Epic 3 | Admin cree des comptes             |
| FR3  | Epic 3 | Admin modifie/supprime des comptes |
| FR4  | Epic 2 | Login utilisateur                  |
| FR5  | Epic 2 | Logout utilisateur                 |
| FR6  | Epic 3 | Changement de mot de passe         |
| FR7  | Epic 3 | Profil sportif                     |
| FR8  | Epic 3 | Preferences d'affichage (unites)   |
| FR9  | Epic 3 | Modification profil/preferences    |
| FR10 | Epic 4 | Saisie seance (socle commun)       |
| FR11 | Epic 4 | Metriques sport-specifiques        |
| FR12 | Epic 4 | Liste des seances                  |
| FR13 | Epic 4 | Modification d'une seance          |
| FR14 | Epic 5 | Suppression seance (soft-delete)   |
| FR15 | Epic 5 | Consultation seances supprimees    |
| FR16 | Epic 5 | Restauration seance                |
| FR17 | Epic 5 | Filtrage et tri des seances        |
| FR18 | Epic 6 | Dashboard metriques cles           |
| FR19 | Epic 6 | Graphiques d'evolution             |
| FR20 | Epic 6 | Zoom temporel                      |
| FR21 | Epic 6 | Affichage unites configurees       |
| FR22 | Epic 4 | Socle commun multi-sport           |
| FR23 | Epic 4 | Metriques extensibles par sport    |
| FR24 | Epic 5 | Consultation par sport             |
| FR25 | Epic 1 | Deploiement Docker                 |
| FR26 | Epic 1 | Mise a jour container              |
| FR27 | Epic 3 | Liste utilisateurs admin           |

## Epic List

### Epic 1 : Squelette Technique & Environnement de Dev

Luka (dev) a un projet initialise, structure, containerise, avec une CI propre et une base de donnees prete. Il peut developper sereinement. Aucune feature end-user, mais tout le socle est la.
**FRs couverts :** FR25, FR26
**Includes :** Init starter AdonisJS (Inertia+React), structure Clean Architecture (dossiers domain/use_cases/repositories), Tailwind + Shadcn/ui, Docker Compose (app + PostgreSQL), CI/CD GitHub Actions, warnings as errors, migrations initiales (users, sessions, sports), seeders sports

### Epic 2 : Authentification & Premier Acces

Le premier utilisateur s'inscrit (= admin auto), peut se connecter et se deconnecter. L'app a son layout de base avec la navigation.
**FRs couverts :** FR1, FR4, FR5
**Includes :** Register (premier = admin), login/logout, sessions cookie + CSRF, layout principal (header, bottom tab bar, AuthLayout), page d'accueil vide (EmptyState)

### Epic 3 : Gestion Utilisateurs & Profils

L'admin invite des utilisateurs, chaque utilisateur personnalise son experience. L'onboarding wizard guide les nouveaux arrivants.
**FRs couverts :** FR2, FR3, FR6, FR7, FR8, FR9, FR27
**Includes :** CRUD admin, changement mot de passe, profil sportif, preferences unites, onboarding wizard 4 etapes, page admin

### Epic 4 : Saisie & Consultation de Seances

Un utilisateur peut logger ses entrainements et les consulter. Le coeur de l'app : saisie manuelle avec socle commun + metriques sport-specifiques, liste des seances, modification.
**FRs couverts :** FR10, FR11, FR12, FR13, FR22, FR23
**Includes :** SessionForm (bottom sheet/modale), session detail, liste seances, edition, modele JSONB sport_metrics, FAB "+"

### Epic 5 : Cycle de Vie des Seances

L'utilisateur a un controle total sur ses donnees : suppression, restauration, filtrage, consultation par sport.
**FRs couverts :** FR14, FR15, FR16, FR17, FR24
**Includes :** Soft-delete + undo toast, corbeille, restauration, filtres/tri, vue par sport

### Epic 6 : Dashboard & Visualisation de Progression

L'utilisateur ouvre l'app et VOIT sa progression. Le moment "aha". Dashboard avec hero metric, quick stats, graphiques d'evolution, zoom temporel.
**FRs couverts :** FR18, FR19, FR20, FR21
**Includes :** HeroMetric, QuickStatCard, SparklineChart, Recharts, zoom semaine/mois, conversion unites

## Epic 1 : Squelette Technique & Environnement de Dev

Luka (dev) a un projet initialise, structure, containerise, avec une CI propre et une base de donnees prete. Il peut developper sereinement.

### Story 1.1 : Initialisation du projet AdonisJS

As a **dev (Luka)**,
I want **initialiser le projet avec le starter AdonisJS Inertia React**,
So that **j'ai un projet fonctionnel avec la stack de base prete a developper**.

**Acceptance Criteria:**

**Given** aucun projet n'existe encore
**When** je lance `pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr`
**Then** le projet est cree avec AdonisJS, Inertia, React, Lucid ORM, VineJS et le systeme d'auth
**And** `node ace serve --hmr` demarre sans erreur et affiche la page d'accueil par defaut dans le navigateur

**Comment tu valides :** `node ace serve --hmr` -> tu vois la page AdonisJS dans le navigateur.

### Story 1.2 : Configuration qualite de code

As a **dev (Luka)**,
I want **configurer ESLint, Prettier et TypeScript en mode strict avec warnings as errors**,
So that **tout code non conforme est bloque des le depart, pas de dette technique**.

**Acceptance Criteria:**

**Given** le projet est initialise (Story 1.1)
**When** je lance `pnpm lint`
**Then** ESLint s'execute avec `--max-warnings 0` et echoue si un warning existe
**And** `pnpm format:check` verifie le formatage Prettier
**And** `tsc --noEmit` compile sans erreur ni warning en mode strict

**Comment tu valides :** Ajoute un `console.log` inutile -> `pnpm lint` echoue. Retire-le -> ca passe.

### Story 1.3 : Structure Clean Architecture

As a **dev (Luka)**,
I want **mettre en place la structure de dossiers Clean Architecture**,
So that **le code est organise des le depart avec des frontieres claires entre controllers, use cases, domain et repositories**.

**Acceptance Criteria:**

**Given** le projet est initialise et la qualite de code configuree
**When** j'ouvre le projet dans mon editeur
**Then** les dossiers suivants existent dans `app/` : `controllers/`, `domain/entities/`, `domain/value_objects/`, `domain/errors/`, `domain/interfaces/`, `use_cases/`, `repositories/`, `validators/`, `middleware/`
**And** chaque dossier contient un fichier `.gitkeep` ou un fichier d'exemple minimal
**And** `pnpm lint` et `tsc --noEmit` passent toujours

**Comment tu valides :** `ls app/domain/entities` -> le dossier existe. `pnpm lint` -> vert.

### Story 1.4 : Configuration Tailwind CSS + Shadcn/ui

As a **dev (Luka)**,
I want **configurer Tailwind CSS et initialiser Shadcn/ui**,
So that **le design system est pret a etre utilise avec les tokens de design (couleurs, typo, espacements)**.

**Acceptance Criteria:**

**Given** le projet est initialise
**When** j'ouvre la page d'accueil dans le navigateur
**Then** Tailwind CSS est actif (les classes utilitaires fonctionnent)
**And** les tokens de design Sporty sont configures dans `tailwind.config.ts` (palette bleu accent, gris, espacements 4px)
**And** Shadcn/ui est initialise et au moins un composant (Button) est importable
**And** la police system native est definie comme font par defaut

**Comment tu valides :** Ajoute `<button className="bg-primary text-white p-4">Test</button>` dans une page -> le bouton apparait bleu avec du padding.

### Story 1.5 : Docker Compose (app + PostgreSQL)

As a **dev (Luka)**,
I want **un docker-compose.yml qui lance l'app et PostgreSQL**,
So that **je peux deployer et developper avec un seul `docker compose up`** (FR25).

**Acceptance Criteria:**

**Given** Docker est installe sur la machine
**When** je lance `docker compose up`
**Then** deux containers demarrent : `app` (AdonisJS) et `db` (PostgreSQL)
**And** l'app est accessible dans le navigateur sur le port configure
**And** PostgreSQL est configure via variables d'environnement dans `.env`
**And** les donnees PostgreSQL persistent dans un volume Docker (NFR15)
**And** `.env` est versionne avec les valeurs par defaut de developpement
**And** `.env.local` est dans `.gitignore` et permet de surcharger les valeurs de `.env`

**Comment tu valides :** `docker compose up -d` sans `.env.local` -> ca tourne avec les valeurs par defaut. Cree un `.env.local` avec un port different -> il est pris en compte.

### Story 1.6 : Migrations initiales & seeders

As a **dev (Luka)**,
I want **les migrations pour les tables users, sessions et sports, et un seeder pour les sports de base**,
So that **le modele de donnees est en place et pret pour le developpement des features**.

**Acceptance Criteria:**

**Given** PostgreSQL tourne via Docker Compose
**When** je lance `node ace migration:run`
**Then** les tables `users`, `sessions` et `sports` sont creees
**And** `users` contient : id, email, password, full_name, role (admin/user), timestamps
**And** `sessions` contient : id, user_id (FK), sport_type, date, duration_minutes, distance_km, avg_heart_rate, perceived_effort, sport_metrics (JSONB), deleted_at (nullable), timestamps
**And** `sports` contient : id, name, slug, default_metrics (JSONB), timestamps
**And** `node ace db:seed` cree le sport "Course a pied" avec ses metriques par defaut
**And** `node ace migration:rollback` annule proprement les migrations

**Comment tu valides :** `node ace migration:run` -> `node ace db:seed` -> connecte-toi a PostgreSQL -> `SELECT * FROM sports;` -> tu vois "Course a pied".

### Story 1.7 : CI/CD GitHub Actions

As a **dev (Luka)**,
I want **une pipeline GitHub Actions qui valide la qualite sur PR et master, et deploie uniquement sur master**,
So that **la qualite est verifiee a chaque changement et le deploiement est automatique sur master** (FR26).

**Acceptance Criteria:**

**Given** le code est pousse sur GitHub
**When** une PR est ouverte ou un push est fait sur n'importe quelle branche ciblant master
**Then** la pipeline execute : ESLint (`--max-warnings 0`), Prettier check, TypeScript compilation, Vite build frontend
**And** la pipeline echoue si l'une de ces etapes echoue

**Given** un push est fait directement sur master (merge de PR)
**When** la pipeline de qualite passe
**Then** un job supplementaire build l'image Docker et la push sur Docker Hub
**And** ce job de deploiement ne se declenche **pas** sur les PRs

**And** le fichier `.github/workflows/ci.yml` est versionne

**Comment tu valides :** Pousse une PR -> lint + format + build s'executent, pas de Docker push. Merge sur master -> lint + format + build + Docker push.

## Epic 2 : Authentification & Premier Acces

Le premier utilisateur s'inscrit (= admin auto), peut se connecter et se deconnecter. L'app a son layout de base.

### Story 2.1 : Inscription & premier compte admin

As a **visiteur (premier utilisateur)**,
I want **m'inscrire sur l'instance Sporty**,
So that **mon compte est cree et je deviens automatiquement administrateur** (FR1).

**Acceptance Criteria:**

**Given** aucun utilisateur n'existe en base
**When** je remplis le formulaire d'inscription (nom, email, mot de passe) et je valide
**Then** mon compte est cree avec le role `admin`
**And** mon mot de passe est hashe en argon2 (jamais stocke en clair)
**And** je suis automatiquement connecte et redirige vers l'accueil

**Given** au moins un utilisateur existe deja en base
**When** un nouveau visiteur tente d'acceder a la page d'inscription
**Then** l'inscription est bloquee (seul l'admin pourra creer des comptes dans l'Epic 3)

**Given** je soumets le formulaire avec des donnees invalides (email mal forme, mot de passe trop court)
**When** la validation s'execute
**Then** des messages d'erreur clairs s'affichent sur les champs concernes

**Comment tu valides :** Ouvre `/register` -> cree un compte -> verifie en base que `role = 'admin'` et que le password est hashe. Ouvre `/register` a nouveau -> acces refuse.

### Story 2.2 : Connexion

As a **utilisateur inscrit**,
I want **me connecter avec mon email et mot de passe**,
So that **j'accede a mon espace personnel** (FR4).

**Acceptance Criteria:**

**Given** je suis sur la page de connexion
**When** je saisis un email et mot de passe valides
**Then** une session cookie est creee avec protection CSRF
**And** je suis redirige vers la page d'accueil

**Given** je saisis un email ou mot de passe incorrect
**When** je soumets le formulaire
**Then** un message d'erreur generique s'affiche ("Identifiants incorrects") sans reveler si c'est l'email ou le mot de passe qui est faux

**Given** je ne suis pas connecte
**When** j'essaie d'acceder a n'importe quelle page protegee
**Then** je suis redirige vers `/login`

**Comment tu valides :** Connecte-toi -> session active. Mauvais mot de passe -> erreur. Deconnecte-toi -> accede a `/` -> redirige vers `/login`.

### Story 2.3 : Deconnexion

As a **utilisateur connecte**,
I want **me deconnecter de mon compte**,
So that **ma session est fermee et mes donnees sont protegees** (FR5).

**Acceptance Criteria:**

**Given** je suis connecte
**When** je clique sur "Se deconnecter"
**Then** ma session est invalidee cote serveur
**And** je suis redirige vers la page de connexion

**Given** je suis deconnecte
**When** j'utilise le bouton "retour" du navigateur
**Then** je ne peux pas acceder aux pages protegees (pas de cache de session)

**Comment tu valides :** Connecte-toi -> deconnecte-toi -> bouton retour du navigateur -> tu restes sur `/login`.

### Story 2.4 : Layout principal & navigation

As a **utilisateur connecte**,
I want **voir l'app avec un header et une navigation claire**,
So that **je peux me reperer et naviguer entre les sections**.

**Acceptance Criteria:**

**Given** je suis connecte et sur n'importe quelle page
**When** je regarde l'interface
**Then** un header affiche le logo "Sporty" et mon avatar/initiale
**And** sur mobile (< 768px) : une bottom tab bar affiche 4 onglets (Accueil, Seances, Planning, Profil)
**And** sur desktop (>= 768px) : une sidebar de navigation remplace la bottom tab bar
**And** les pages de login/register utilisent un AuthLayout separe (centre, sans navigation)

**Given** je clique sur un onglet de navigation
**When** la page se charge
**Then** la navigation se fait en SPA sans rechargement complet (Inertia)
**And** l'onglet actif est visuellement distingue

**Comment tu valides :** Connecte-toi -> tu vois le header + bottom tab bar sur mobile. Redimensionne en desktop -> sidebar. Clique sur un onglet -> navigation fluide sans flash blanc.

### Story 2.5 : Page d'accueil (EmptyState)

As a **utilisateur connecte sans donnees**,
I want **voir un ecran d'accueil accueillant qui m'invite a commencer**,
So that **je comprends immediatement quoi faire ensuite**.

**Acceptance Criteria:**

**Given** je suis connecte et je n'ai aucune seance enregistree
**When** j'arrive sur la page d'accueil
**Then** un EmptyState s'affiche avec une illustration/icone, un message accueillant ("Saisis ta premiere seance pour commencer") et un bouton CTA
**And** le ton est bienveillant, sans pression

**Given** je clique sur le bouton CTA
**When** l'action se declenche
**Then** rien ne se passe encore (le formulaire de saisie sera implemente en Epic 4) — le bouton est present mais desactive ou affiche un placeholder

**Comment tu valides :** Connecte-toi avec un compte sans seances -> tu vois le message d'accueil et le CTA. Pas de page blanche.

## Epic 3 : Gestion Utilisateurs & Profils

L'admin invite des utilisateurs, chaque utilisateur personnalise son experience. L'onboarding wizard guide les nouveaux arrivants.

### Story 3.1 : Admin - liste des utilisateurs

As a **admin**,
I want **consulter la liste de tous les utilisateurs du serveur**,
So that **je vois qui a un compte et je peux gerer mes utilisateurs** (FR27).

**Acceptance Criteria:**

**Given** je suis connecte en tant qu'admin
**When** je navigue vers Profil > Administration
**Then** je vois la liste des utilisateurs avec nom, email et date de creation

**Given** je suis connecte en tant qu'utilisateur simple
**When** je navigue vers mon profil
**Then** aucune section "Administration" n'est visible

**Comment tu valides :** Connecte-toi en admin -> Profil > Administration -> tu vois la liste. Connecte-toi en user -> pas de section admin.

### Story 3.2 : Admin - creer un compte utilisateur

As a **admin**,
I want **creer un compte pour un nouvel utilisateur**,
So that **je peux inviter des proches a utiliser l'instance** (FR2).

**Acceptance Criteria:**

**Given** je suis sur la page d'administration
**When** je clique "Ajouter" et remplis le formulaire (nom, email, mot de passe temporaire)
**Then** le compte est cree avec le role `user`
**And** le mot de passe est hashe en argon2

**Given** je tente de creer un compte avec un email deja existant
**When** je soumets le formulaire
**Then** une erreur claire s'affiche ("Cet email est deja utilise")

**Comment tu valides :** Cree un utilisateur -> verifie en base qu'il existe avec `role = 'user'`. Recree avec le meme email -> erreur.

### Story 3.3 : Admin - modifier et supprimer un compte

As a **admin**,
I want **modifier les infos d'un utilisateur ou supprimer son compte**,
So that **je garde le controle sur les comptes de mon instance** (FR3).

**Acceptance Criteria:**

**Given** je suis sur la liste des utilisateurs
**When** je clique sur un utilisateur
**Then** je vois ses details et je peux modifier son nom et son email

**Given** je clique sur "Reinitialiser le mot de passe"
**When** je saisis un nouveau mot de passe temporaire
**Then** le mot de passe de l'utilisateur est mis a jour (hashe argon2)

**Given** je clique sur "Supprimer" sur un compte utilisateur
**When** je confirme la suppression
**Then** le compte est supprime

**Given** je tente de supprimer mon propre compte admin
**When** je clique "Supprimer"
**Then** l'action est bloquee ("Impossible de supprimer votre propre compte")

**Comment tu valides :** Modifie le nom d'un user -> verifie en base. Supprime un user -> il disparait de la liste. Tente de te supprimer toi-meme -> bloque.

### Story 3.4 : Changement de mot de passe

As a **utilisateur connecte**,
I want **modifier mon mot de passe**,
So that **je peux securiser mon compte ou changer le mot de passe temporaire donne par l'admin** (FR6).

**Acceptance Criteria:**

**Given** je suis sur ma page de profil
**When** je remplis le formulaire de changement de mot de passe (ancien mot de passe, nouveau, confirmation)
**Then** mon mot de passe est mis a jour si l'ancien est correct
**And** un feedback confirme le changement ("Mot de passe modifie")

**Given** je saisis un ancien mot de passe incorrect
**When** je soumets le formulaire
**Then** une erreur s'affiche ("Mot de passe actuel incorrect")

**Given** le nouveau mot de passe et la confirmation ne correspondent pas
**When** je soumets le formulaire
**Then** une erreur s'affiche ("Les mots de passe ne correspondent pas")

**Comment tu valides :** Change ton mot de passe -> deconnecte-toi -> reconnecte-toi avec le nouveau -> ca marche. Ancien mdp faux -> erreur.

### Story 3.5 : Onboarding wizard (premier login)

As a **nouvel utilisateur (premier login)**,
I want **etre guide pour configurer mon profil sportif et mes preferences**,
So that **l'app est personnalisee des le depart sans friction** (FR7, FR8).

**Acceptance Criteria:**

**Given** je me connecte pour la premiere fois (profil non complete)
**When** j'arrive dans l'app
**Then** le wizard d'onboarding se lance automatiquement en 4 etapes

**Given** je suis sur l'etape 1 (Sport)
**When** je selectionne un sport via une grille d'icones
**Then** mon sport est enregistre et je passe a l'etape suivante

**Given** je suis sur l'etape 2 (Niveau)
**When** je choisis entre Debutant / Intermediaire / Confirme (3 cartes)
**Then** mon niveau est enregistre

**Given** je suis sur l'etape 3 (Objectif)
**When** je choisis un objectif ou je skip ("Pas d'objectif precis")
**Then** mon objectif est enregistre (ou vide si skip)

**Given** je suis sur l'etape 4 (Preferences)
**When** je choisis mes unites d'affichage (km/h ou min/km)
**Then** mes preferences sont sauvegardees
**And** je suis redirige vers la page d'accueil

**And** une barre de progression (4 dots) est visible en haut a chaque etape
**And** je peux revenir en arriere a tout moment

**Comment tu valides :** Cree un user via l'admin -> connecte-toi avec ce user -> le wizard se lance. Complete les 4 etapes -> tu arrives sur l'accueil. Reconnecte-toi -> le wizard ne se relance pas.

### Story 3.6 : Page profil - consultation et modification

As a **utilisateur connecte**,
I want **consulter et modifier mon profil sportif et mes preferences a tout moment**,
So that **je peux ajuster mes reglages sans repasser par le wizard** (FR7, FR8, FR9).

**Acceptance Criteria:**

**Given** je navigue vers l'onglet Profil
**When** la page se charge
**Then** je vois mes informations actuelles : nom, email, sport(s), niveau, objectif, preferences d'unites

**Given** je modifie un champ (ex: niveau, unites) et je sauvegarde
**When** la requete est traitee
**Then** mes modifications sont enregistrees
**And** un feedback confirme ("Profil mis a jour")

**Given** je change mes unites de km/h a min/km
**When** je retourne sur l'accueil
**Then** les donnees s'affichent dans les nouvelles unites (applicable quand l'Epic 6 sera en place)

**Comment tu valides :** Va dans Profil -> modifie ton niveau -> sauvegarde -> rafraichis la page -> la valeur est persistee.

## Epic 4 : Saisie & Consultation de Seances

Un utilisateur peut logger ses entrainements et les consulter. Le coeur de l'app.

### Story 4.1 : Saisie d'une seance

As a **utilisateur connecte**,
I want **saisir une seance d'entrainement rapidement**,
So that **mes donnees sont enregistrees et je construis mon historique** (FR10, FR11, FR22, FR23).

**Acceptance Criteria:**

**Given** je suis sur n'importe quelle page
**When** je tape sur le FAB "+" (mobile) ou le bouton "Nouvelle seance" (desktop)
**Then** un bottom sheet (mobile) ou une modale (desktop) s'ouvre avec le formulaire de saisie

**Given** le formulaire est ouvert
**When** je regarde les champs visibles
**Then** je vois les champs principaux : Sport (dropdown, pre-rempli avec le dernier sport utilise), Date (pre-remplie a aujourd'hui), Duree (hh:mm), Distance (km)
**And** une section "Plus de details" est repliee en dessous

**Given** je deplie "Plus de details"
**When** je regarde les champs secondaires
**Then** je vois : FC moyenne (bpm), Allure (auto-calculee si duree + distance renseignes), Ressenti (emoji picker), Notes libres
**And** les metriques affichees sont specifiques au sport selectionne (FR23)

**Given** je remplis au minimum duree et distance et je clique "Enregistrer"
**When** la requete est traitee
**Then** la seance est sauvegardee en base avec les donnees socle commun + sport_metrics (JSONB)
**And** le bottom sheet/modale se ferme
**And** un toast confirme "Seance ajoutee"
**And** le bouton CTA de l'EmptyState (story 2.5) mene desormais a ce formulaire

**Given** je swipe down (mobile) ou clique hors zone sans avoir rempli de champs
**When** le bottom sheet se ferme
**Then** aucune donnee n'est perdue (rien n'a ete saisi)

**Given** j'ai commence a remplir des champs et je tente de fermer
**When** je swipe down ou clique hors zone
**Then** une confirmation s'affiche "Abandonner la saisie ?"

**Comment tu valides :** Tap sur "+" -> remplis sport + duree + distance -> Enregistrer -> toast "Seance ajoutee". Verifie en base que la ligne existe dans `sessions` avec `sport_metrics` JSONB rempli.

### Story 4.2 : Liste des seances

As a **utilisateur connecte**,
I want **consulter la liste de mes seances passees**,
So that **je peux retrouver et parcourir mon historique d'entrainement** (FR12).

**Acceptance Criteria:**

**Given** j'ai des seances enregistrees
**When** je navigue vers l'onglet "Seances"
**Then** je vois mes seances listees par ordre chronologique decroissant (les plus recentes en haut)
**And** chaque seance affiche : sport, date, duree, distance et ressenti

**Given** je n'ai aucune seance
**When** je navigue vers l'onglet "Seances"
**Then** un EmptyState s'affiche avec invitation a saisir une premiere seance

**Given** j'ai beaucoup de seances
**When** je scroll la liste
**Then** les seances se chargent de maniere fluide (pagination ou scroll infini)

**Comment tu valides :** Saisis 3 seances -> onglet Seances -> tu les vois toutes dans l'ordre, la plus recente en haut.

### Story 4.3 : Detail d'une seance

As a **utilisateur connecte**,
I want **voir tous les details d'une seance**,
So that **je peux consulter l'ensemble des metriques enregistrees**.

**Acceptance Criteria:**

**Given** je suis sur la liste des seances
**When** je tape sur une seance
**Then** une vue detail s'ouvre en plein ecran (push navigation)
**And** je vois toutes les metriques : sport, date, duree, distance, allure, FC moyenne, ressenti, notes
**And** les metriques specifiques au sport sont affichees (sport_metrics JSONB)

**Given** je suis sur la vue detail
**When** je clique sur "Retour"
**Then** je reviens a la liste des seances a la meme position de scroll

**Comment tu valides :** Tape sur une seance -> tu vois toutes les metriques. Retour -> tu es au meme endroit dans la liste.

### Story 4.4 : Modification d'une seance

As a **utilisateur connecte**,
I want **modifier une seance existante**,
So that **je peux corriger une erreur de saisie** (FR13).

**Acceptance Criteria:**

**Given** je suis sur la vue detail d'une seance
**When** je clique sur "Modifier" (icone ou texte en haut a droite)
**Then** le formulaire de saisie s'ouvre pre-rempli avec les donnees existantes (meme formulaire que la story 4.1)

**Given** je modifie un ou plusieurs champs et je clique "Enregistrer"
**When** la requete est traitee
**Then** les modifications sont sauvegardees en base
**And** je reviens a la vue detail avec les donnees mises a jour
**And** un toast confirme "Seance modifiee"

**Given** je modifie la distance de 5 km a 15 km
**When** je sauvegarde et consulte la seance
**Then** la distance affiche bien 15 km et l'allure est recalculee

**Comment tu valides :** Ouvre une seance -> Modifier -> change la distance de 10 a 15 -> Enregistrer -> la vue detail affiche 15 km. Rafraichis la page -> toujours 15 km.

## Epic 5 : Cycle de Vie des Seances

L'utilisateur a un controle total sur ses donnees : suppression, restauration, filtrage, consultation par sport.

### Story 5.1 : Suppression d'une seance (soft-delete)

As a **utilisateur connecte**,
I want **supprimer une seance**,
So that **je peux nettoyer mon historique sans perdre definitivement mes donnees** (FR14).

**Acceptance Criteria:**

**Given** je suis sur la vue detail d'une seance
**When** je clique sur "Supprimer"
**Then** une confirmation s'affiche ("Supprimer cette seance ?")

**Given** je confirme la suppression
**When** la requete est traitee
**Then** la seance est marquee `deleted_at` en base (soft-delete, pas de suppression physique)
**And** je suis redirige vers la liste des seances
**And** un toast s'affiche "Seance supprimee" avec un bouton "Annuler" pendant 5 secondes

**Given** je clique "Annuler" sur le toast dans les 5 secondes
**When** la restauration s'execute
**Then** la seance reapparait dans la liste (le `deleted_at` est remis a null)

**Given** la seance est supprimee
**When** je consulte la liste des seances
**Then** la seance supprimee n'apparait plus dans la liste principale

**Comment tu valides :** Supprime une seance -> elle disparait de la liste. Clique "Annuler" dans les 5s -> elle revient. Supprime a nouveau, attends 5s -> elle reste supprimee.

### Story 5.2 : Corbeille - consultation des seances supprimees

As a **utilisateur connecte**,
I want **consulter mes seances supprimees**,
So that **je peux retrouver une seance que j'ai supprimee par erreur** (FR15).

**Acceptance Criteria:**

**Given** j'ai des seances supprimees
**When** je navigue vers Profil > Corbeille
**Then** je vois la liste de mes seances supprimees avec sport, date, duree, distance
**And** chaque seance affiche sa date de suppression

**Given** je n'ai aucune seance supprimee
**When** je navigue vers la corbeille
**Then** un message indique "Aucune seance dans la corbeille"

**Comment tu valides :** Supprime 2 seances -> Profil > Corbeille -> tu vois les 2 seances avec leur date de suppression.

### Story 5.3 : Restauration d'une seance

As a **utilisateur connecte**,
I want **restaurer une seance depuis la corbeille**,
So that **je peux recuperer une seance supprimee par erreur** (FR16).

**Acceptance Criteria:**

**Given** je suis dans la corbeille et je vois une seance supprimee
**When** je clique sur "Restaurer"
**Then** la seance est restauree (`deleted_at` remis a null)
**And** elle reapparait dans la liste principale des seances
**And** elle disparait de la corbeille
**And** un toast confirme "Seance restauree"

**Comment tu valides :** Va dans la corbeille -> restaure une seance -> elle disparait de la corbeille. Va dans l'onglet Seances -> elle est de retour.

### Story 5.4 : Filtrage, tri et consultation par sport

As a **utilisateur connecte**,
I want **filtrer et trier mes seances, et les consulter par sport**,
So that **je retrouve facilement les seances qui m'interessent** (FR17, FR24).

**Acceptance Criteria:**

**Given** je suis sur la liste des seances
**When** je selectionne un filtre par sport (ex: "Course a pied")
**Then** seules les seances de ce sport sont affichees (FR24)

**Given** je suis sur la liste des seances
**When** je choisis un critere de tri (date, duree, distance)
**Then** la liste se reordonne selon ce critere (ascendant/descendant)

**Given** j'applique un filtre par sport ET un tri par distance
**When** la liste se met a jour
**Then** je vois uniquement les seances du sport filtre, triees par distance

**Given** j'ai des filtres actifs
**When** je clique sur "Reinitialiser les filtres"
**Then** tous les filtres sont retires et je vois toutes mes seances

**Comment tu valides :** Saisis des seances de course et de velo -> filtre par "Course a pied" -> seules les courses apparaissent. Trie par distance -> l'ordre change. Reinitialise -> tout revient.

## Epic 6 : Dashboard & Visualisation de Progression

L'utilisateur ouvre l'app et VOIT sa progression. Le moment "aha".

### Story 6.1 : Dashboard - HeroMetric

As a **utilisateur connecte avec des seances**,
I want **voir mon chiffre cle de progression des l'ouverture de l'app**,
So that **je comprends immediatement ou j'en suis** (FR18).

**Acceptance Criteria:**

**Given** j'ai des seances enregistrees
**When** j'arrive sur la page d'accueil
**Then** le composant HeroMetric affiche ma metrique cle (ex: allure moyenne) en grand et bold
**And** un badge de tendance indique l'evolution recente (ex: "-18s/km ce mois")
**And** un mini-graphique sparkline a droite montre la tendance visuelle

**Given** j'ai moins de 2 seances
**When** j'arrive sur la page d'accueil
**Then** le HeroMetric affiche "—" avec un message "Pas assez de donnees"

**Given** la tendance est positive
**When** je regarde le badge
**Then** il est affiche en vert doux (couleur success)

**Given** la tendance est neutre ou negative
**When** je regarde le badge
**Then** il est affiche en gris neutre (jamais de rouge)

**Comment tu valides :** Saisis 5 seances avec des allures variees -> accueil -> tu vois l'allure moyenne en gros avec la tendance et le sparkline.

### Story 6.2 : Dashboard - QuickStatCards

As a **utilisateur connecte avec des seances**,
I want **voir mes metriques secondaires en un coup d'oeil**,
So that **j'ai une vue rapide sur mon volume, ma FC et ma frequence d'entrainement** (FR18).

**Acceptance Criteria:**

**Given** j'ai des seances enregistrees
**When** j'arrive sur la page d'accueil
**Then** 3 QuickStatCards s'affichent en ligne sous le HeroMetric :

- Volume hebdomadaire (km)
- FC moyenne
- Nombre de seances (cette semaine)
  **And** chaque carte affiche la valeur, l'unite et une tendance

**Given** je suis sur mobile (< 768px)
**When** je regarde les QuickStatCards
**Then** elles occupent chacune 1/3 de la largeur, compactes

**Given** je suis sur desktop
**When** je regarde le dashboard
**Then** les QuickStatCards sont integrees dans la grille a cote du HeroMetric

**Comment tu valides :** Accueil -> tu vois 3 mini-cartes avec volume, FC et nombre de seances. Redimensionne mobile/desktop -> le layout s'adapte.

### Story 6.3 : Graphiques d'evolution

As a **utilisateur connecte avec des seances**,
I want **visualiser l'evolution de mes donnees sur le temps**,
So that **je VOIS ma progression concretement** (FR19).

**Acceptance Criteria:**

**Given** j'ai des seances sur plusieurs semaines
**When** je scroll sous les QuickStatCards sur la page d'accueil
**Then** un graphique Recharts affiche l'evolution de l'allure moyenne par seance (courbe)
**And** je peux basculer entre les metriques : allure, FC moyenne, volume (distance cumulee)

**Given** je survole (desktop) ou tape (mobile) sur un point du graphique
**When** le tooltip s'affiche
**Then** il montre la date et la valeur exacte de cette seance

**Given** j'ai peu de donnees (< 3 seances)
**When** le graphique se charge
**Then** il affiche les points disponibles sans message d'erreur

**Given** j'ai beaucoup de donnees (~500 seances)
**When** le graphique se charge
**Then** il s'affiche de maniere fluide en moins de 2 secondes (NFR2)

**Comment tu valides :** Saisis 10 seances sur 3 semaines -> accueil -> tu vois la courbe d'allure. Bascule sur FC -> la courbe change. Survole un point -> tooltip avec la valeur.

### Story 6.4 : Zoom temporel

As a **utilisateur connecte**,
I want **zoomer sur une periode (semaine ou mois) sur mes graphiques**,
So that **je peux analyser ma progression sur la periode qui m'interesse** (FR20).

**Acceptance Criteria:**

**Given** je suis sur le graphique d'evolution
**When** je selectionne "Semaine"
**Then** le graphique affiche uniquement les donnees de la semaine en cours
**And** les QuickStatCards se mettent a jour pour refleter la periode selectionnee

**Given** je selectionne "Mois"
**When** le graphique se met a jour
**Then** il affiche les donnees du mois en cours

**Given** je suis sur mobile
**When** je swipe horizontalement sur le selecteur de periode
**Then** je bascule entre Semaine et Mois de maniere fluide

**Given** je change de periode
**When** les donnees se rechargent
**Then** la transition est fluide (pas de flash blanc ni de layout shift)

**Comment tu valides :** Graphique -> selectionne "Semaine" -> seules les donnees de la semaine apparaissent. Selectionne "Mois" -> le graphique s'elargit a tout le mois. Les stats se mettent a jour.

### Story 6.5 : Affichage dans les unites configurees

As a **utilisateur connecte**,
I want **voir toutes mes donnees affichees dans les unites que j'ai choisies**,
So that **les metriques sont dans le format qui me parle** (FR21).

**Acceptance Criteria:**

**Given** j'ai configure mes unites en "min/km" dans mon profil
**When** je consulte le dashboard (HeroMetric, QuickStatCards, graphiques)
**Then** toutes les allures sont affichees en min/km

**Given** j'ai configure mes unites en "km/h"
**When** je consulte le dashboard
**Then** toutes les allures sont affichees en km/h

**Given** je change mes unites dans le profil de min/km a km/h
**When** je reviens sur le dashboard
**Then** toutes les valeurs sont immediatement converties dans la nouvelle unite
**And** les donnees stockees en base ne sont pas modifiees (conversion a l'affichage uniquement)

**Given** je consulte le detail d'une seance ou la liste des seances
**When** les donnees s'affichent
**Then** les unites respectent egalement ma preference

**Comment tu valides :** Configure "min/km" -> dashboard affiche "5'12/km". Change en "km/h" -> dashboard affiche "11.5 km/h". Verifie en base -> la valeur stockee n'a pas change.
