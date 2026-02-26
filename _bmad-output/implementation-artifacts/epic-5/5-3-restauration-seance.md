# Story 5.3: Restauration d'une séance

Status: done

## Story

As a **utilisateur connecté**,
I want **restaurer une séance depuis la corbeille**,
So that **je peux récupérer une séance supprimée par erreur** (FR16).

## Acceptance Criteria (BDD)

### AC1 — Bouton restaurer dans la corbeille
**Given** je suis dans la corbeille et je vois une séance supprimée
**When** je clique sur "Restaurer"
**Then** la séance est restaurée (`deleted_at` remis à null)
**And** elle réapparaît dans la liste principale des séances
**And** elle disparaît de la corbeille
**And** un toast confirme "Séance restaurée"

## Tasks / Subtasks

- [x] Task 1 — Vérifier le use case `RestoreSession` (AC: #1)
  - [x] Normalement créé en Story 5.1 — vérifier qu'il existe
  - [x] Sinon créer `app/use_cases/sessions/restore_session.ts`
  - [x] Ownership check + appel `sessionRepository.restore(id)`

- [x] Task 2 — Vérifier la route restore (AC: #1)
  - [x] Normalement créée en Story 5.1 : `POST /sessions/:id/restore`
  - [x] Sinon l'ajouter dans `start/routes.ts`

- [x] Task 3 — Bouton "Restaurer" dans la page Trash (AC: #1)
  - [x] Ajouter un bouton "Restaurer" sur chaque séance dans `Sessions/Trash.tsx`
  - [x] Appeler `POST /sessions/:id/restore` via `router.post()` d'Inertia
  - [x] Afficher toast "Séance restaurée" après succès
  - [x] La séance disparaît de la liste (re-render automatique via Inertia)

- [x] Task 4 — Tests fonctionnels (AC: #1)
  - [x] `tests/functional/sessions/restore_session.spec.ts`
  - [x] Test : restore remet deleted_at à null
  - [x] Test : séance réapparaît dans la liste principale après restore
  - [x] Test : séance disparaît de la corbeille après restore
  - [x] Test : ownership check (403 si pas propriétaire)
  - [x] Test : 404 si séance non trouvée ou pas dans la corbeille

## Dev Notes

### Ce qui existe déjà (NE PAS recréer)
- **Repository `restore()`** dans `lucid_session_repository.ts` — déjà implémenté
- **Route `POST /sessions/:id/restore`** — créée en Story 5.1
- **Use case `RestoreSession`** — créé en Story 5.1
- **Controller `restore()`** — créé en Story 5.1
- **Page `Sessions/Trash.tsx`** — créée en Story 5.2

### Scope de cette story
- Cette story est principalement **l'intégration frontend** du bouton restaurer dans la corbeille
- Le backend (use case, route, controller) est déjà en place depuis 5.1
- Le gros du travail : le bouton dans Trash.tsx + toast de confirmation + tests

### Patterns à suivre
- Toast de succès : même pattern que la suppression en Story 5.1
- Appel Inertia : `router.post(route('sessions.restore', { id }), {}, { preserveScroll: true })`
- Le re-render de la liste se fait automatiquement par Inertia après la redirection

### Dépendance
- **Story 5.1** doit être terminée (use case + route + controller restore)
- **Story 5.2** doit être terminée (page Trash.tsx existe)

### References
- [Source: _bmad-output/epics/epic-5-cycle-vie-seances.md#Story 5.3]
- [Source: app/repositories/lucid_session_repository.ts#restore]
- [Source: 5-1-suppression-seance-soft-delete.md — Task 2 et 4]
- [Source: 5-2-corbeille-seances-supprimees.md — Task 5]

## Dev Agent Record

### Implementation Notes

- Tasks 1, 2, 3 : backend (use case, route, controller, bouton Trash.tsx) déjà intégralement implémentés en Stories 5.1 et 5.2
- Toast "Séance restaurée" : géré via `session.flash('success', ...)` côté controller + `FlashMessages.tsx` côté client — aucune modification nécessaire dans `Trash.tsx`
- Fix lint : `scheduleAutoDismiss` déplacée à l'intérieur du `useEffect` dans `FlashMessages.tsx` pour corriger `react-hooks/exhaustive-deps` (erreur introduite en 5.2)
- Tests fonctionnels : 6 tests couvrant les 5 scénarios requis par la story (deleted_at null, réapparition liste, disparition corbeille, ownership, introuvable, non connecté)

### Files Modified

- `inertia/components/shared/FlashMessages.tsx` — fix lint react-hooks/exhaustive-deps
- `tests/functional/sessions/restore_session.spec.ts` — nouveau (6 tests)

### Change Log

- 2026-02-26 — Story 5.3 implémentée : tests fonctionnels restore + fix lint FlashMessages. CI verte. AC#1 satisfait.
