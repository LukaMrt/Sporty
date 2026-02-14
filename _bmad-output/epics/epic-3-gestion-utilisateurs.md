# Epic 3 : Gestion Utilisateurs & Profils

L'admin invite des utilisateurs, chaque utilisateur personnalise son experience. L'onboarding wizard guide les nouveaux arrivants.

**FRs couverts :** FR2, FR3, FR6, FR7, FR8, FR9, FR27
**Includes :** CRUD admin, changement mot de passe, profil sportif, preferences unites, onboarding wizard 4 etapes, page admin

---

## Story 3.1 : Admin - liste des utilisateurs

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

---

## Story 3.2 : Admin - creer un compte utilisateur

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

---

## Story 3.3 : Admin - modifier et supprimer un compte

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

---

## Story 3.4 : Changement de mot de passe

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

---

## Story 3.5 : Onboarding wizard (premier login)

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

---

## Story 3.6 : Page profil - consultation et modification

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
