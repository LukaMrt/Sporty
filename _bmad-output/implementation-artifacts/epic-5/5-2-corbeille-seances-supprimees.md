# Story 5.2: Corbeille — consultation des séances supprimées

Status: done

## Story

As a **utilisateur connecté**,
I want **consulter mes séances supprimées dans une corbeille**,
So that **je peux retrouver une séance que j'ai supprimée par erreur** (FR15).

## Acceptance Criteria (BDD)

### AC1 — Accès à la corbeille
**Given** je suis connecté
**When** je navigue vers la corbeille (Profil > Corbeille ou `/sessions/trash`)
**Then** je vois la liste de mes séances supprimées

### AC2 — Informations affichées
**Given** j'ai des séances supprimées
**When** je consulte la corbeille
**Then** chaque séance affiche : sport, date de la séance, durée, distance
**And** chaque séance affiche sa date de suppression

### AC3 — Corbeille vide
**Given** je n'ai aucune séance supprimée
**When** je navigue vers la corbeille
**Then** un message indique "Aucune séance dans la corbeille"

## Tasks / Subtasks

- [x] Task 1 — Use case `ListTrashedSessions` (AC: #1, #2)
  - [x] Créer `app/use_cases/sessions/list_trashed_sessions.ts`
  - [x] Utiliser le scope `onlyTrashed()` du modèle Session
  - [x] Retourner les séances avec `deletedAt` inclus dans le résultat
  - [x] Ajouter `deletedAt` à l'entité `TrainingSession` (ou créer un type `TrashedSession` qui l'étend)
  - [x] Test unitaire `tests/unit/use_cases/list_trashed_sessions.spec.ts`

- [x] Task 2 — Repository : méthode `findTrashedByUserId` (AC: #1)
  - [x] Ajouter `findTrashedByUserId(userId: number): Promise<TrainingSession[]>` dans l'interface `SessionRepository`
  - [x] Implémenter dans `LucidSessionRepository` avec scope `onlyTrashed()`
  - [x] Inclure `deletedAt` dans la conversion entity
  - [x] Pagination optionnelle (si beaucoup de séances supprimées — à évaluer, liste simple probablement suffisante)

- [x] Task 3 — Controller action `trash()` (AC: #1, #2, #3)
  - [x] Ajouter méthode `trash()` dans `sessions_controller.ts`
  - [x] Rendre la page `Sessions/Trash` via Inertia avec les séances supprimées

- [x] Task 4 — Route (AC: #1)
  - [x] `GET /sessions/trash` → sessions.trash
  - [x] IMPORTANT : déclarer **avant** `GET /sessions/:id` dans routes.ts pour éviter que `:id` matche "trash"

- [x] Task 5 — Page frontend `Sessions/Trash.tsx` (AC: #1, #2, #3)
  - [x] Créer `inertia/pages/Sessions/Trash.tsx`
  - [x] Afficher la liste des séances supprimées (sport, date, durée, distance, date de suppression)
  - [x] Empty state : "Aucune séance dans la corbeille" avec icône
  - [x] Chaque séance a un bouton "Restaurer" (prépare la Story 5.3)
  - [x] Lien d'accès depuis la page Profil ou navigation

- [x] Task 6 — Navigation vers la corbeille
  - [x] Ajouter un lien "Corbeille" dans la page Profil ou dans la navigation des séances
  - [ ] Badge optionnel avec le nombre de séances en corbeille

- [x] Task 7 — Tests fonctionnels (AC: #1-3)
  - [x] `tests/functional/sessions/trash_sessions.spec.ts`
  - [x] Test : liste uniquement les séances avec deleted_at non null
  - [x] Test : n'affiche pas les séances actives
  - [x] Test : retourne vide si aucune séance supprimée
  - [x] Test : isolation par utilisateur (ne voit pas les séances supprimées des autres)

## Dev Notes

### Ce qui existe déjà (NE PAS recréer)
- **Scope `onlyTrashed()`** sur le modèle Session — filtre `WHERE deleted_at IS NOT NULL`
- **Scope `withoutTrashed()`** — déjà utilisé par `findAllByUserId` pour la liste principale
- **Repository `restore()`** — déjà implémenté (sera utilisé en Story 5.3)

### Point d'attention : entité TrainingSession
- L'entité actuelle `app/domain/entities/training_session.ts` n'a **pas** de champ `deletedAt`
- Il faut soit l'ajouter en optionnel (`deletedAt?: DateTime`), soit créer un type distinct `TrashedSession`
- Recommandation : ajouter `deletedAt?: string | null` à l'interface `TrainingSession` (simple, pas de nouveau type)

### Point d'attention : ordre des routes
- `GET /sessions/trash` DOIT être déclaré **avant** `GET /sessions/:id` sinon AdonisJS matchera "trash" comme un `:id`
- Pattern déjà connu en AdonisJS — routes statiques avant routes paramétrées

### Patterns à suivre
- Page liste similaire à `Sessions/Index.tsx` pour le layout
- Réutiliser un composant card ou créer un `TrashedSessionCard` simple
- Empty state pattern : voir `EmptyState` composant existant dans `inertia/components/shared/`
- Flash messages pour la restauration (sera ajouté en Story 5.3)

### Project Structure Notes
- Nouveau fichier backend : `app/use_cases/sessions/list_trashed_sessions.ts`
- Nouvelle page frontend : `inertia/pages/Sessions/Trash.tsx`
- Route : `GET /sessions/trash` (intentionnelle — "corbeille des séances")

### References
- [Source: _bmad-output/epics/epic-5-cycle-vie-seances.md#Story 5.2]
- [Source: app/models/session.ts#onlyTrashed scope]
- [Source: app/domain/entities/training_session.ts]
- [Source: app/repositories/lucid_session_repository.ts]
- [Source: inertia/pages/Sessions/Index.tsx]

## Dev Agent Record

### Implementation Notes

- `deletedAt?: string | null` ajouté à l'entité `TrainingSession` (optionnel, compatible avec tous les usages existants)
- `findTrashedByUserId` ajouté dans `SessionRepository` (abstract class) et implémenté dans `LucidSessionRepository` avec `onlyTrashed()` scope, trié par `deletedAt DESC`
- `#toEntity` mis à jour : `deletedAt: model.deletedAt?.toISO() ?? null`
- `ListTrashedSessions` use case : pattern identique à `ListSessions`, injection du `SessionRepository`
- Controller `trash()` injecte `ListTrashedSessions` via le constructeur `@inject()`
- Route `GET /sessions/trash` déclarée **avant** `GET /sessions/:id` — évite le match paramétrée
- Page `Sessions/Trash.tsx` : empty state + liste inline (pas de composant dédié, liste simple suffisante) + bouton Restaurer (prépare Story 5.3)
- Navigation : lien "Voir la corbeille" ajouté dans `Profile/Edit.tsx`
- Badge (Task 6 optionnel) non implémenté — hors scope de la story, aucun AC ne le requiert
- Tests fonctionnels : vérification via DB (pattern du projet) — `response.body().props` non utilisable sans header `X-Inertia: true`

### Files Modified

- `app/domain/entities/training_session.ts` — ajout `deletedAt?: string | null`
- `app/domain/interfaces/session_repository.ts` — ajout `findTrashedByUserId`
- `app/repositories/lucid_session_repository.ts` — implémentation `findTrashedByUserId` + `#toEntity` mis à jour
- `app/use_cases/sessions/list_trashed_sessions.ts` — nouveau
- `app/controllers/sessions/sessions_controller.ts` — ajout `trash()` + injection `ListTrashedSessions`
- `start/routes.ts` — route `GET /sessions/trash` avant `GET /sessions/:id`
- `inertia/pages/Sessions/Trash.tsx` — nouvelle page
- `inertia/pages/Profile/Edit.tsx` — lien corbeille ajouté
- `tests/helpers/mock_session_repository.ts` — ajout `findTrashedByUserId` dans le mock
- `tests/unit/use_cases/sessions/list_trashed_sessions.spec.ts` — nouveau (4 tests)
- `tests/functional/sessions/trash_sessions.spec.ts` — nouveau (6 tests)

### Change Log

- 2026-02-26 — Story 5.2 implémentée : corbeille des séances supprimées (AC#1, AC#2, AC#3 satisfaits). CI verte, 167 tests passants.
