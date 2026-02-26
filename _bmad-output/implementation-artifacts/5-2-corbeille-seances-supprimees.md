# Story 5.2: Corbeille — consultation des séances supprimées

Status: ready-for-dev

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

- [ ] Task 1 — Use case `ListTrashedSessions` (AC: #1, #2)
  - [ ] Créer `app/use_cases/sessions/list_trashed_sessions.ts`
  - [ ] Utiliser le scope `onlyTrashed()` du modèle Session
  - [ ] Retourner les séances avec `deletedAt` inclus dans le résultat
  - [ ] Ajouter `deletedAt` à l'entité `TrainingSession` (ou créer un type `TrashedSession` qui l'étend)
  - [ ] Test unitaire `tests/unit/use_cases/list_trashed_sessions.spec.ts`

- [ ] Task 2 — Repository : méthode `findTrashedByUserId` (AC: #1)
  - [ ] Ajouter `findTrashedByUserId(userId: number): Promise<TrainingSession[]>` dans l'interface `SessionRepository`
  - [ ] Implémenter dans `LucidSessionRepository` avec scope `onlyTrashed()`
  - [ ] Inclure `deletedAt` dans la conversion entity
  - [ ] Pagination optionnelle (si beaucoup de séances supprimées — à évaluer, liste simple probablement suffisante)

- [ ] Task 3 — Controller action `trash()` (AC: #1, #2, #3)
  - [ ] Ajouter méthode `trash()` dans `sessions_controller.ts`
  - [ ] Rendre la page `Sessions/Trash` via Inertia avec les séances supprimées

- [ ] Task 4 — Route (AC: #1)
  - [ ] `GET /sessions/trash` → sessions.trash
  - [ ] IMPORTANT : déclarer **avant** `GET /sessions/:id` dans routes.ts pour éviter que `:id` matche "trash"

- [ ] Task 5 — Page frontend `Sessions/Trash.tsx` (AC: #1, #2, #3)
  - [ ] Créer `inertia/pages/Sessions/Trash.tsx`
  - [ ] Afficher la liste des séances supprimées (sport, date, durée, distance, date de suppression)
  - [ ] Empty state : "Aucune séance dans la corbeille" avec icône
  - [ ] Chaque séance a un bouton "Restaurer" (prépare la Story 5.3)
  - [ ] Lien d'accès depuis la page Profil ou navigation

- [ ] Task 6 — Navigation vers la corbeille
  - [ ] Ajouter un lien "Corbeille" dans la page Profil ou dans la navigation des séances
  - [ ] Badge optionnel avec le nombre de séances en corbeille

- [ ] Task 7 — Tests fonctionnels (AC: #1-3)
  - [ ] `tests/functional/sessions/trash_sessions.spec.ts`
  - [ ] Test : liste uniquement les séances avec deleted_at non null
  - [ ] Test : n'affiche pas les séances actives
  - [ ] Test : retourne vide si aucune séance supprimée
  - [ ] Test : isolation par utilisateur (ne voit pas les séances supprimées des autres)

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
