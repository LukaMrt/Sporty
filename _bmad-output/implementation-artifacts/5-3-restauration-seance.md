# Story 5.3: Restauration d'une séance

Status: ready-for-dev

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

- [ ] Task 1 — Vérifier le use case `RestoreSession` (AC: #1)
  - [ ] Normalement créé en Story 5.1 — vérifier qu'il existe
  - [ ] Sinon créer `app/use_cases/sessions/restore_session.ts`
  - [ ] Ownership check + appel `sessionRepository.restore(id)`

- [ ] Task 2 — Vérifier la route restore (AC: #1)
  - [ ] Normalement créée en Story 5.1 : `POST /sessions/:id/restore`
  - [ ] Sinon l'ajouter dans `start/routes.ts`

- [ ] Task 3 — Bouton "Restaurer" dans la page Trash (AC: #1)
  - [ ] Ajouter un bouton "Restaurer" sur chaque séance dans `Sessions/Trash.tsx`
  - [ ] Appeler `POST /sessions/:id/restore` via `router.post()` d'Inertia
  - [ ] Afficher toast "Séance restaurée" après succès
  - [ ] La séance disparaît de la liste (re-render automatique via Inertia)

- [ ] Task 4 — Tests fonctionnels (AC: #1)
  - [ ] `tests/functional/sessions/restore_session.spec.ts`
  - [ ] Test : restore remet deleted_at à null
  - [ ] Test : séance réapparaît dans la liste principale après restore
  - [ ] Test : séance disparaît de la corbeille après restore
  - [ ] Test : ownership check (403 si pas propriétaire)
  - [ ] Test : 404 si séance non trouvée ou pas dans la corbeille

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
