# Story 4.2 : Liste des séances

Status: done

## Story

As a **utilisateur connecté**,
I want **consulter la liste de mes séances passées**,
so that **je peux retrouver et parcourir mon historique d'entraînement** (FR12).

## Acceptance Criteria

1. **Given** j'ai des séances enregistrées **When** je navigue vers l'onglet "Séances" **Then** je vois mes séances listées par ordre chronologique décroissant (les plus récentes en haut) **And** chaque séance affiche : sport, date, durée, distance et ressenti
2. **Given** je n'ai aucune séance **When** je navigue vers l'onglet "Séances" **Then** un EmptyState s'affiche avec invitation à saisir une première séance (CTA ouvre le formulaire de saisie)
3. **Given** j'ai beaucoup de séances **When** je scroll la liste **Then** les séances se chargent de manière fluide (pagination serveur)

## Tasks / Subtasks

- [x] Task 1 : Use Case — ListSessions (AC: #1, #3)
  - [x] Créer `app/use_cases/sessions/list_sessions.ts`
  - [x] `@inject()`, reçoit `SessionRepository`
  - [x] `execute(userId: number, page?: number, perPage?: number)` : retourne `{ data: TrainingSession[], meta: { total, page, perPage, lastPage } }`
  - [x] Pagination par défaut : page 1, perPage 20
  - [x] Tri par date DESC (le plus récent en premier)

- [x] Task 2 : Repository — ajouter pagination (AC: #3)
  - [x] Enrichir `findAllByUserId` dans `LucidSessionRepository` pour accepter `{ page?, perPage? }` en option
  - [x] Utiliser `.paginate(page, perPage)` de Lucid
  - [x] Mapper les résultats paginés vers l'entité domain + meta pagination

- [x] Task 3 : Controller — index (AC: #1, #2)
  - [x] Implémenter `SessionsController.index`
  - [x] Charger `ListSessions.execute(auth.user!.id, page)` avec `page` depuis query string
  - [x] Render `Sessions/Index` avec props : `{ sessions: { data, meta } }`

- [x] Task 4 : Composant SessionCard (AC: #1)
  - [x] Créer `inertia/components/sessions/SessionCard.tsx`
  - [x] Affiche : date formatée, durée (Xh Ymin), distance (km), ressenti (emoji)
  - [x] Cliquable → navigue vers `/sessions/:id` (story 4.3)
  - [x] Design mobile-first : card compacte, zones tactiles ≥ 44px

- [x] Task 5 : Page Sessions/Index complète (AC: #1, #2, #3)
  - [x] Compléter `inertia/pages/Sessions/Index.tsx` initié en story 4.1
  - [x] Si `sessions.data.length === 0` : EmptyState avec CTA qui navigue vers `/sessions/create`
  - [x] Si des séances existent : liste de `SessionCard` + pagination (boutons "Précédent" / "Suivant")
  - [x] En-tête de la page : titre "Séances" + bouton "Nouvelle séance" (desktop) + FAB (mobile)
  - [x] Pagination : utiliser `router.get('/sessions', { page: nextPage }, { preserveState: true })`

- [x] Task 6 : Tests unitaires (AC: #1, #3)
  - [x] Créer `tests/unit/use_cases/sessions/list_sessions.spec.ts`
  - [x] Tests : retourne les séances de l'utilisateur, pagination correcte, liste vide si aucune séance

- [x] Task 7 : Tests fonctionnels (AC: #1, #2, #3)
  - [x] Créer `tests/functional/sessions/sessions.spec.ts`
  - [x] `GET /sessions` connecté avec séances → 200
  - [x] `GET /sessions` connecté sans séances → 200
  - [x] `GET /sessions?page=1` → pagination correcte
  - [x] Vérifie que les séances d'un autre user ne sont PAS incluses

## Dev Notes

### Pagination Lucid

```typescript
// Dans LucidSessionRepository
async findAllByUserId(userId: number, opts: { page?: number; perPage?: number } = {}) {
  const page = opts.page ?? 1
  const perPage = opts.perPage ?? 20
  const result = await SessionModel.query()
    .withScopes((s) => s.withoutTrashed())
    .where('userId', userId)
    .orderBy('date', 'desc')
    .paginate(page, perPage)
  return {
    data: result.all().map((m) => this.#toEntity(m)),
    meta: { total: result.total, page: result.currentPage, perPage: result.perPage, lastPage: result.lastPage },
  }
}
```

### Props Inertia pour Sessions/Index

```typescript
// SessionsController.index
return inertia.render('Sessions/Index', {
  sessions: {
    data: paginatedSessions.data.map(s => ({
      id: s.id,
      sportType: s.sportId,
      sportName: s.sportName,
      date: s.date,
      durationMinutes: s.durationMinutes,
      distanceKm: s.distanceKm,
      perceivedEffort: s.perceivedEffort,
    })),
    meta: paginatedSessions.meta,
  },
})
```

### Pagination frontend

Utiliser les liens Inertia pour une navigation SPA fluide :

```typescript
import { router } from '@inertiajs/react'
// Bouton page suivante
router.get('/sessions', { page: meta.page + 1 }, { preserveState: true, preserveScroll: true })
```

### SessionCard — format d'affichage

- **Durée** : `formatDuration(minutes)` → `45min`, `1h`, `1h 40min`
- **Distance** : `Number(distanceKm).toFixed(1)` (décimale DB sérialisée en string)
- **Ressenti** : `EFFORT_EMOJIS` partagé depuis `inertia/lib/effort.ts`
- **Date** : `formatDate(iso)` → "Aujourd'hui", "Hier", "25 févr."

### Isolation des données utilisateur

**CRITIQUE :** le `SessionsController.index` ne doit JAMAIS charger les séances de tous les utilisateurs. Toujours filtrer par `auth.user!.id`.

### Fichiers à créer / modifier

| Action   | Fichier                                                |
|----------|--------------------------------------------------------|
| Créer    | `app/domain/entities/pagination.ts`                    |
| Modifier | `app/domain/interfaces/session_repository.ts`          |
| Modifier | `app/repositories/lucid_session_repository.ts`         |
| Modifier | `app/use_cases/sessions/list_sessions.ts`              |
| Modifier | `app/controllers/sessions/sessions_controller.ts`      |
| Créer    | `inertia/components/sessions/SessionCard.tsx`          |
| Créer    | `inertia/lib/effort.ts`                                |
| Créer    | `inertia/lib/format.ts`                                |
| Modifier | `inertia/pages/Sessions/Index.tsx`                     |
| Modifier | `tests/helpers/mock_session_repository.ts`             |
| Créer    | `tests/unit/use_cases/sessions/list_sessions.spec.ts`  |
| Créer    | `tests/functional/sessions/sessions.spec.ts`           |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns — pagination]
- [Source: app/models/session.ts — scopes withoutTrashed]
- [Source: Story 4.1 — fondations SessionRepository, Controller, Page]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `distanceKm` sérialisé en string par PostgreSQL (colonne DECIMAL) → `Number()` avant `.toFixed()`
- Apostrophes typographiques dans les strings de test → remplacées par apostrophes ASCII

### Completion Notes List

- Use case `ListSessions` mis à jour avec pagination `{ page, perPage }` → `PaginatedResult<TrainingSession>`
- Port `SessionRepository.findAllByUserId` migré de `{ limit, offset }` vers `{ page, perPage }` + retour paginé
- `LucidSessionRepository` utilise `.paginate(page, perPage)` de Lucid ORM
- `SessionCard` composant mobile-first avec `formatDuration` / `formatDate` / `EFFORT_EMOJIS` extraits dans `inertia/lib/`
- Emojis de ressenti unifiés entre `SessionCard` et `SessionForm` via `inertia/lib/effort.ts`
- Page Index revient à la navigation vers `/sessions/create` (page dédiée)

### File List

- `app/domain/entities/pagination.ts` (créé)
- `app/domain/interfaces/session_repository.ts` (modifié)
- `app/repositories/lucid_session_repository.ts` (modifié)
- `app/use_cases/sessions/list_sessions.ts` (modifié)
- `app/controllers/sessions/sessions_controller.ts` (modifié)
- `inertia/components/sessions/SessionCard.tsx` (créé)
- `inertia/components/sessions/SessionForm.tsx` (modifié — import EFFORT_EMOJIS)
- `inertia/lib/effort.ts` (créé)
- `inertia/lib/format.ts` (créé)
- `inertia/pages/Sessions/Index.tsx` (modifié)
- `tests/helpers/mock_session_repository.ts` (modifié)
- `tests/unit/use_cases/sessions/list_sessions.spec.ts` (créé)
- `tests/functional/sessions/sessions.spec.ts` (créé)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modifié)
