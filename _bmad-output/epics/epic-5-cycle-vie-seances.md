# Epic 5 : Cycle de Vie des Seances

L'utilisateur a un controle total sur ses donnees : suppression, restauration, filtrage, consultation par sport.

**FRs couverts :** FR14, FR15, FR16, FR17, FR24
**Includes :** Soft-delete + undo toast, corbeille, restauration, filtres/tri, vue par sport

---

## Story 5.1 : Suppression d'une seance (soft-delete)

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

---

## Story 5.2 : Corbeille - consultation des seances supprimees

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

---

## Story 5.3 : Restauration d'une seance

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

---

## Story 5.4 : Filtrage, tri et consultation par sport

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
