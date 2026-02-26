# Story 5.1: Suppression d'une séance (soft-delete)

Status: ready-for-dev

## Story

As a **utilisateur connecté**,
I want **supprimer une séance depuis la vue détail**,
So that **je peux nettoyer mon historique sans perdre définitivement mes données** (FR14).

## Acceptance Criteria (BDD)

### AC1 — Confirmation de suppression
**Given** je suis sur la vue détail d'une séance (`/sessions/:id`)
**When** je clique sur "Supprimer"
**Then** une modale de confirmation s'affiche ("Supprimer cette séance ?")

### AC2 — Soft-delete + redirection + toast undo
**Given** je confirme la suppression
**When** la requête est traitée
**Then** la séance est marquée `deleted_at = now()` en base (soft-delete)
**And** je suis redirigé vers la liste des séances (`/sessions`)
**And** un toast s'affiche "Séance supprimée" avec un bouton "Annuler" pendant 5 secondes

### AC3 — Undo (restauration via toast)
**Given** je clique "Annuler" sur le toast dans les 5 secondes
**When** la restauration s'exécute
**Then** la séance réapparaît dans la liste (`deleted_at` remis à null)

### AC4 — Séance masquée de la liste
**Given** la séance est supprimée (soft-delete)
**When** je consulte la liste des séances
**Then** la séance supprimée n'apparaît plus dans la liste principale

## Tasks / Subtasks

- [ ] Task 1 — Use case `DeleteSession` (AC: #2)
  - [ ] Créer `app/use_cases/sessions/delete_session.ts`
  - [ ] Vérifier ownership (userId) avant suppression
  - [ ] Appeler `sessionRepository.softDelete(id)` (déjà implémenté)
  - [ ] Test unitaire `tests/unit/use_cases/delete_session.spec.ts`

- [ ] Task 2 — Use case `RestoreSession` (AC: #3)
  - [ ] Créer `app/use_cases/sessions/restore_session.ts`
  - [ ] Vérifier ownership avant restauration
  - [ ] Appeler `sessionRepository.restore(id)` (déjà implémenté)
  - [ ] Test unitaire `tests/unit/use_cases/restore_session.spec.ts`

- [ ] Task 3 — Controller actions delete + restore (AC: #2, #3)
  - [ ] Ajouter méthode `destroy()` dans `app/controllers/sessions/sessions_controller.ts`
  - [ ] Ajouter méthode `restore()` dans le même controller
  - [ ] Gestion d'erreurs : SessionNotFoundError → 404, SessionForbiddenError → 403

- [ ] Task 4 — Routes (AC: #2, #3)
  - [ ] `DELETE /sessions/:id` → sessions.destroy
  - [ ] `POST /sessions/:id/restore` → sessions.restore
  - [ ] Ajouter dans `start/routes.ts` sous le groupe auth

- [ ] Task 5 — Frontend : bouton supprimer + modale confirmation (AC: #1)
  - [ ] Ajouter bouton "Supprimer" sur `inertia/pages/Sessions/Show.tsx`
  - [ ] Utiliser composant `AlertDialog` de shadcn/ui pour la confirmation
  - [ ] Texte : "Supprimer cette séance ?" avec boutons Annuler / Supprimer

- [ ] Task 6 — Frontend : toast undo (AC: #2, #3)
  - [ ] Après suppression réussie, afficher toast avec bouton "Annuler"
  - [ ] Le bouton "Annuler" appelle `POST /sessions/:id/restore` via Inertia router
  - [ ] Timer 5 secondes côté frontend (le toast disparaît automatiquement)
  - [ ] Utiliser le composant `Toast`/`Sonner` de shadcn/ui

- [ ] Task 7 — Tests fonctionnels (AC: #1-4)
  - [ ] `tests/functional/sessions/delete_session.spec.ts`
  - [ ] Test : suppression soft-delete OK (deleted_at set)
  - [ ] Test : séance disparaît de la liste après suppression
  - [ ] Test : restore remet deleted_at à null
  - [ ] Test : ownership check (403 si pas propriétaire)

## Dev Notes

### Ce qui existe déjà (NE PAS recréer)
- **Modèle** `app/models/session.ts` : colonne `deletedAt` + scopes `withoutTrashed()` et `onlyTrashed()`
- **Repository interface** `app/domain/interfaces/session_repository.ts` : méthodes `softDelete(id)` et `restore(id)` déjà définies
- **Repository impl** `app/repositories/lucid_session_repository.ts` : `softDelete()` et `restore()` déjà implémentés
- **Liste existante** filtre déjà via `withoutTrashed()` — les séances supprimées sont déjà masquées
- **Erreurs domain** : `SessionNotFoundError` et `SessionForbiddenError` existent

### Patterns à suivre (tirés de l'Epic 4)
- Controller mince : validate → use case → response (voir `sessions_controller.ts` existant)
- Use cases : injectés via IoC container, reçoivent le repository en constructeur
- Ownership check pattern : `if (session.userId !== userId) throw new SessionForbiddenError()`
- Flash messages : `session.flash('success', 'message')` puis `response.redirect().toRoute('sessions.index')`
- Tests fonctionnels : `group.each.setup(() => testUtils.db().withGlobalTransaction())`

### Architecture du toast undo
- Le toast "Annuler" est **purement frontend** — pas de timer côté serveur
- Le backend expose simplement `POST /sessions/:id/restore` sans contrainte de temps
- Le frontend gère le timer de 5s et l'affichage du toast
- Après expiration du toast, l'ID de la séance supprimée n'est plus accessible côté UI (mais restore reste possible depuis la corbeille — Story 5.3)

### Project Structure Notes
- Nouveaux fichiers backend : snake_case.ts (convention AdonisJS)
- Routes intentionnelles : `DELETE /sessions/:id` + `POST /sessions/:id/restore`
- Pas de nouveau validator nécessaire (delete/restore n'ont pas de body)

### References
- [Source: _bmad-output/epics/epic-5-cycle-vie-seances.md#Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Soft-delete]
- [Source: app/repositories/lucid_session_repository.ts#softDelete,restore]
- [Source: app/models/session.ts#scopes]
- [Source: app/controllers/sessions/sessions_controller.ts]
