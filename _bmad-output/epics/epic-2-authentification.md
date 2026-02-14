# Epic 2 : Authentification & Premier Acces

Le premier utilisateur s'inscrit (= admin auto), peut se connecter et se deconnecter. L'app a son layout de base avec la navigation.

**FRs couverts :** FR1, FR4, FR5
**Includes :** Register (premier = admin), login/logout, sessions cookie + CSRF, layout principal (header, bottom tab bar, AuthLayout), page d'accueil vide (EmptyState)

---

## Story 2.1 : Inscription & premier compte admin

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

---

## Story 2.2 : Connexion

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

---

## Story 2.3 : Deconnexion

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

---

## Story 2.4 : Layout principal & navigation

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

---

## Story 2.5 : Page d'accueil (EmptyState)

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
