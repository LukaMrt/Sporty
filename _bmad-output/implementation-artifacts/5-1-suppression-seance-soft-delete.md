# Story 5.1: Suppression d'une séance (soft-delete)

Status: review

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

- [x] Task 1 — Use case `DeleteSession` (AC: #2)
  - [x] Créer `app/use_cases/sessions/delete_session.ts`
  - [x] Vérifier ownership (userId) avant suppression
  - [x] Appeler `sessionRepository.softDelete(id)` (déjà implémenté)
  - [x] Test unitaire `tests/unit/use_cases/delete_session.spec.ts`

- [x] Task 2 — Use case `RestoreSession` (AC: #3)
  - [x] Créer `app/use_cases/sessions/restore_session.ts`
  - [x] Vérifier ownership avant restauration
  - [x] Appeler `sessionRepository.restore(id)` (déjà implémenté)
  - [x] Test unitaire `tests/unit/use_cases/restore_session.spec.ts`

- [x] Task 3 — Controller actions delete + restore (AC: #2, #3)
  - [x] Ajouter méthode `destroy()` dans `app/controllers/sessions/sessions_controller.ts`
  - [x] Ajouter méthode `restore()` dans le même controller
  - [x] Gestion d'erreurs : SessionNotFoundError → redirect + flash, SessionForbiddenError → redirect + flash

- [x] Task 4 — Routes (AC: #2, #3)
  - [x] `DELETE /sessions/:id` → sessions.destroy
  - [x] `POST /sessions/:id/restore` → sessions.restore
  - [x] Ajouter dans `start/routes.ts` sous le groupe auth

- [x] Task 5 — Frontend : bouton supprimer + modale confirmation (AC: #1)
  - [x] Ajouter bouton "Supprimer" sur `inertia/pages/Sessions/Show.tsx`
  - [x] Utiliser composant `Dialog` de shadcn/ui pour la confirmation (AlertDialog non disponible)
  - [x] Texte : "Supprimer cette séance ?" avec boutons Annuler / Supprimer

- [x] Task 6 — Frontend : toast undo (AC: #2, #3)
  - [x] Après suppression réussie, afficher toast avec bouton "Annuler"
  - [x] Le bouton "Annuler" appelle `POST /sessions/:id/restore` via Inertia router
  - [x] Timer 5 secondes côté frontend (le toast disparaît automatiquement)
  - [x] Implémenté via extension du composant `FlashMessages` existant (flash `deleted_session_id`)

- [x] Task 7 — Tests fonctionnels (AC: #1-4)
  - [x] `tests/functional/sessions/delete_session.spec.ts`
  - [x] Test : suppression soft-delete OK (deleted_at set)
  - [x] Test : séance disparaît de la liste après suppression
  - [x] Test : restore remet deleted_at à null
  - [x] Test : ownership check (redirect + flash error si pas propriétaire)

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

## Dev Agent Record

### Implementation Notes

**Task 1 — DeleteSession use case**
- Pattern identique à `UpdateSession` : findById → ownership check → action repository
- `SessionRepository` abstrait avait déjà `softDelete()` et `restore()` définis + mockés

**Task 2 — RestoreSession use case**
- Même pattern ownership check, appelle `repository.restore(id)`

**Task 3 — Controller**
- `destroy()` : flash `deleted_session_id` (pas `success`) pour permettre le toast undo différencié
- `restore()` : redirect vers `/sessions/:id` pour revenir sur la séance restaurée

**Task 5 — Frontend modale**
- `AlertDialog` de shadcn/ui non disponible (`@radix-ui/react-alert-dialog` pas installé)
- Utilisé `Dialog` existant — même UX, légère différence d'accessibilité (focus trap non forcé)

**Task 6 — Toast undo**
- Extension de `FlashMessages` existant : détection de `flash.deleted_session_id`
- Toast type `undo` avec bouton "Annuler" qui appelle `router.post('/sessions/:id/restore')`
- Timer 5s géré par le mécanisme existant (`DISMISS_DELAY = 5000`)

### File List

- `app/use_cases/sessions/delete_session.ts` (créé)
- `app/use_cases/sessions/restore_session.ts` (créé)
- `app/controllers/sessions/sessions_controller.ts` (modifié)
- `start/routes.ts` (modifié)
- `inertia/pages/Sessions/Show.tsx` (modifié)
- `inertia/components/shared/FlashMessages.tsx` (modifié)
- `tests/unit/use_cases/sessions/delete_session.spec.ts` (créé)
- `tests/unit/use_cases/sessions/restore_session.spec.ts` (créé)
- `tests/functional/sessions/delete_session.spec.ts` (créé)

### Change Log

- 2026-02-26 : Implémentation complète story 5.1 — soft-delete + restore + toast undo
