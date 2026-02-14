# Epic 4 : Saisie & Consultation de Seances

Un utilisateur peut logger ses entrainements et les consulter. Le coeur de l'app : saisie manuelle avec socle commun + metriques sport-specifiques, liste des seances, modification.

**FRs couverts :** FR10, FR11, FR12, FR13, FR22, FR23
**Includes :** SessionForm (bottom sheet/modale), session detail, liste seances, edition, modele JSONB sport_metrics, FAB "+"

---

## Story 4.1 : Saisie d'une seance

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

---

## Story 4.2 : Liste des seances

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

---

## Story 4.3 : Detail d'une seance

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

---

## Story 4.4 : Modification d'une seance

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
