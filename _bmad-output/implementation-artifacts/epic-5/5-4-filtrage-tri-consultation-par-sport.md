# Story 5.4: Filtrage, tri et consultation par sport

Status: done

## Story

As a **utilisateur connecté**,
I want **filtrer et trier mes séances, et les consulter par sport**,
So that **je retrouve facilement les séances qui m'intéressent** (FR17, FR24).

## Acceptance Criteria (BDD)

### AC1 — Filtre par sport
**Given** je suis sur la liste des séances
**When** je sélectionne un filtre par sport (ex: "Course à pied")
**Then** seules les séances de ce sport sont affichées

### AC2 — Tri par critère
**Given** je suis sur la liste des séances
**When** je choisis un critère de tri (date, durée, distance)
**Then** la liste se réordonne selon ce critère (ascendant/descendant)

### AC3 — Filtre + tri combinés
**Given** j'applique un filtre par sport ET un tri par distance
**When** la liste se met à jour
**Then** je vois uniquement les séances du sport filtré, triées par distance

### AC4 — Réinitialisation des filtres
**Given** j'ai des filtres actifs
**When** je clique sur "Réinitialiser les filtres"
**Then** tous les filtres sont retirés et je vois toutes mes séances

## Tasks / Subtasks

- [ ] Task 1 — Étendre le repository `findAllByUserId` (AC: #1, #2, #3)
  - [ ] Ajouter les options de filtrage au type `ListSessionsOptions` dans `session_repository.ts` :
    - `sportId?: number` — filtre par sport
    - `sortBy?: 'date' | 'duration_minutes' | 'distance_km'` — critère de tri
    - `sortOrder?: 'asc' | 'desc'` — ordre de tri
  - [ ] Implémenter dans `LucidSessionRepository.findAllByUserId()` :
    - `WHERE sport_id = ?` si sportId fourni
    - `ORDER BY <sortBy> <sortOrder>` (défaut : date desc)
  - [ ] Mettre à jour le mock repository pour les tests

- [ ] Task 2 — Étendre le use case `ListSessions` (AC: #1, #2, #3)
  - [ ] Accepter les options de filtrage/tri en input
  - [ ] Passer les options au repository
  - [ ] Test unitaire : vérifier que les options sont transmises au repository

- [ ] Task 3 — Validator pour les query params (AC: #1, #2)
  - [ ] Créer `app/validators/sessions/list_sessions_validator.ts`
  - [ ] Valider : `sport_id` (optionnel, positif), `sort_by` (enum), `sort_order` (enum asc/desc), `page` (positif)
  - [ ] Les query params arrivent via GET `/sessions?sportId=1&sortBy=date&sortOrder=desc`

- [ ] Task 4 — Controller : passer filtres au use case (AC: #1, #2, #3)
  - [ ] Modifier `index()` dans `sessions_controller.ts`
  - [ ] Extraire les query params validés
  - [ ] Passer les filtres au use case `ListSessions`
  - [ ] Passer la liste des sports + filtres actifs aux props Inertia pour le frontend

- [ ] Task 5 — Routes : query params (AC: #1, #2)
  - [ ] Pas de nouvelle route — `GET /sessions` accepte déjà les query params
  - [ ] Vérifier que la route passe bien les query strings

- [ ] Task 6 — Frontend : UI de filtrage et tri (AC: #1, #2, #3, #4)
  - [ ] Modifier `inertia/pages/Sessions/Index.tsx`
  - [ ] Ajouter un sélecteur de sport (dropdown/Select shadcn) au-dessus de la liste
  - [ ] Ajouter un sélecteur de tri (date, durée, distance) + toggle asc/desc
  - [ ] Bouton "Réinitialiser" visible quand des filtres sont actifs
  - [ ] Utiliser `router.get()` d'Inertia avec les query params pour recharger la page filtrée
  - [ ] Conserver les filtres actifs dans l'URL (query params) pour le partage/bookmark
  - [ ] Pré-sélectionner les filtres actifs depuis les props Inertia

- [ ] Task 7 — Tests fonctionnels (AC: #1-4)
  - [ ] `tests/functional/sessions/filter_sessions.spec.ts`
  - [ ] Test : filtre par sport retourne uniquement les séances du sport
  - [ ] Test : tri par date asc/desc
  - [ ] Test : tri par durée
  - [ ] Test : tri par distance
  - [ ] Test : combinaison filtre sport + tri
  - [ ] Test : sans filtre = toutes les séances
  - [ ] Test : les séances supprimées (soft-delete) ne sont jamais retournées

## Dev Notes

### Ce qui existe déjà (NE PAS recréer)
- **`findAllByUserId(userId, opts?)`** dans le repository — accepte déjà `page` et `perPage` via `PaginationOptions`
- **Scope `withoutTrashed()`** — déjà appliqué dans le repository
- **Liste des sports** — déjà chargée dans d'autres controllers (voir `sessions_controller.create()`)
- **Page `Sessions/Index.tsx`** — existe avec pagination, à étendre
- **Composant `SessionCard`** — existe, réutilisable tel quel

### Stratégie d'implémentation
- Les filtres sont **côté serveur** (query params → SQL WHERE/ORDER BY) — pas de filtrage client
- Cela garantit que la pagination reste cohérente avec les filtres
- Les query params dans l'URL permettent le deep-linking et le refresh
- Pattern Inertia : `router.get('/sessions', { sportId, sortBy, sortOrder, page }, { preserveState: true })`

### Convention query params
- URL : `?sportId=1&sortBy=date&sortOrder=desc&page=1`
- camelCase dans l'URL (convention architecture.md)
- Convertis en snake_case côté validator/controller si nécessaire

### Tri par défaut
- Sans tri explicite : `date DESC` (séances les plus récentes en premier — comportement actuel)

### Project Structure Notes
- Nouveau fichier : `app/validators/sessions/list_sessions_validator.ts`
- Fichiers modifiés : `session_repository.ts` (interface), `lucid_session_repository.ts` (impl), `list_sessions.ts` (use case), `sessions_controller.ts` (index), `Sessions/Index.tsx` (frontend)

### References
- [Source: _bmad-output/epics/epic-5-cycle-vie-seances.md#Story 5.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Routes intentionnelles — query params camelCase]
- [Source: app/domain/interfaces/session_repository.ts#findAllByUserId]
- [Source: app/repositories/lucid_session_repository.ts#findAllByUserId]
- [Source: inertia/pages/Sessions/Index.tsx]
