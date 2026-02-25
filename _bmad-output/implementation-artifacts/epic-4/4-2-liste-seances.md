# Story 4.2 : Liste des séances

Status: ready-for-dev

## Story

As a **utilisateur connecté**,
I want **consulter la liste de mes séances passées**,
so that **je peux retrouver et parcourir mon historique d'entraînement** (FR12).

## Acceptance Criteria

1. **Given** j'ai des séances enregistrées **When** je navigue vers l'onglet "Séances" **Then** je vois mes séances listées par ordre chronologique décroissant (les plus récentes en haut) **And** chaque séance affiche : sport, date, durée, distance et ressenti
2. **Given** je n'ai aucune séance **When** je navigue vers l'onglet "Séances" **Then** un EmptyState s'affiche avec invitation à saisir une première séance (CTA ouvre le formulaire de saisie)
3. **Given** j'ai beaucoup de séances **When** je scroll la liste **Then** les séances se chargent de manière fluide (pagination serveur)

## Tasks / Subtasks

- [ ] Task 1 : Use Case — ListSessions (AC: #1, #3)
  - [ ] Créer `app/use_cases/sessions/list_sessions.ts`
  - [ ] `@inject()`, reçoit `SessionRepository`
  - [ ] `execute(userId: number, page?: number, perPage?: number)` : retourne `{ data: TrainingSession[], meta: { total, page, perPage, lastPage } }`
  - [ ] Pagination par défaut : page 1, perPage 20
  - [ ] Tri par date DESC (le plus récent en premier)

- [ ] Task 2 : Repository — ajouter pagination (AC: #3)
  - [ ] Enrichir `findAllByUserId` dans `LucidSessionRepository` pour accepter `{ page?, perPage? }` en option
  - [ ] Utiliser `.paginate(page, perPage)` de Lucid
  - [ ] Mapper les résultats paginés vers l'entité domain + meta pagination

- [ ] Task 3 : Controller — index (AC: #1, #2)
  - [ ] Implémenter `SessionsController.index`
  - [ ] Charger `ListSessions.execute(auth.user!.id, page)` avec `page` depuis query string
  - [ ] Charger les sports via `ListSports` (pour le formulaire de saisie intégré dans la page)
  - [ ] Render `Sessions/Index` avec props : `{ sessions: { data, meta }, sports }`

- [ ] Task 4 : Composant SessionCard (AC: #1)
  - [ ] Créer `inertia/components/sessions/SessionCard.tsx`
  - [ ] Affiche : icône sport, date formatée, durée (hh:mm), distance (km), ressenti (emoji)
  - [ ] Cliquable → navigue vers `/sessions/:id` (story 4.3)
  - [ ] Design mobile-first : card compacte, zones tactiles ≥ 44px

- [ ] Task 5 : Page Sessions/Index complète (AC: #1, #2, #3)
  - [ ] Compléter `inertia/pages/Sessions/Index.tsx` initié en story 4.1
  - [ ] Si `sessions.data.length === 0` : EmptyState avec CTA qui ouvre le formulaire
  - [ ] Si des séances existent : liste de `SessionCard` + pagination (boutons "Précédent" / "Suivant" ou lien Inertia)
  - [ ] En-tête de la page : titre "Séances" + bouton "Nouvelle séance" (desktop) + FAB (mobile)
  - [ ] Le formulaire de saisie (story 4.1) est intégré via Dialog/Sheet dans cette même page
  - [ ] Pagination : utiliser `router.get('/sessions', { page: nextPage }, { preserveState: true })`

- [ ] Task 6 : Tests unitaires (AC: #1, #3)
  - [ ] Créer `tests/unit/use_cases/sessions/list_sessions.spec.ts`
  - [ ] Tests : retourne les séances de l'utilisateur, pagination correcte, liste vide si aucune séance

- [ ] Task 7 : Tests fonctionnels (AC: #1, #2, #3)
  - [ ] Ajouter à `tests/functional/sessions/sessions.spec.ts`
  - [ ] `GET /sessions` connecté avec séances → 200 + sessions dans les props
  - [ ] `GET /sessions` connecté sans séances → 200 + sessions vide
  - [ ] `GET /sessions?page=2` → pagination correcte
  - [ ] Vérifie que les séances d'un autre user ne sont PAS incluses

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
      sportType: s.sportType,
      date: s.date,
      durationMinutes: s.durationMinutes,
      distanceKm: s.distanceKm,
      perceivedEffort: s.perceivedEffort,
    })),
    meta: paginatedSessions.meta,
  },
  sports: sports.map(s => ({ id: s.id, name: s.name, slug: s.slug })),
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

- **Durée** : convertir `durationMinutes` en `hh:mm` → `Math.floor(d/60) + ':' + (d%60).toString().padStart(2, '0')`
- **Distance** : afficher avec 1 décimale si > 0 → `10.5 km`
- **Ressenti** : mapper 1-5 vers des emojis → `['😵', '😓', '😐', '😊', '🤩']`
- **Date** : format relatif pour les récentes ("Aujourd'hui", "Hier") puis format court ("25 fév.")

### Isolation des données utilisateur

**CRITIQUE :** le `SessionsController.index` ne doit JAMAIS charger les séances de tous les utilisateurs. Toujours filtrer par `auth.user!.id`. Le test fonctionnel doit vérifier qu'un user A ne voit pas les séances du user B.

### Dépendance Story 4.1

Cette story s'appuie sur les fondations de 4.1 :
- `SessionRepository` (port + implémentation)
- `SessionsController` (déjà créé avec le constructeur)
- Page `Sessions/Index.tsx` (déjà initiée)
- Composants Shadcn installés

### Fichiers à créer / modifier

| Action   | Fichier                                                |
|----------|--------------------------------------------------------|
| Créer    | `app/use_cases/sessions/list_sessions.ts`              |
| Créer    | `inertia/components/sessions/SessionCard.tsx`          |
| Modifier | `app/repositories/lucid_session_repository.ts` (pagination) |
| Modifier | `app/domain/interfaces/session_repository.ts` (signature pagination) |
| Modifier | `app/controllers/sessions/sessions_controller.ts` (index) |
| Modifier | `inertia/pages/Sessions/Index.tsx` (liste complète)    |
| Créer    | `tests/unit/use_cases/sessions/list_sessions.spec.ts`  |
| Modifier | `tests/functional/sessions/sessions.spec.ts` (ajout tests GET) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns — pagination]
- [Source: app/models/session.ts — scopes withoutTrashed]
- [Source: Story 4.1 — fondations SessionRepository, Controller, Page]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
