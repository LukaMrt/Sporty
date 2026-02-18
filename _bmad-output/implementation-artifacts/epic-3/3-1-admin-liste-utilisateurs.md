# Story 3.1 : Admin — Liste des utilisateurs

Status: ready-for-dev

## Story

As a **admin**,
I want **consulter la liste de tous les utilisateurs du serveur**,
so that **je vois qui a un compte et je peux gérer mes utilisateurs** (FR27).

## Acceptance Criteria

1. **Given** je suis connecté en tant qu'admin **When** je navigue vers Profil > Administration **Then** je vois la liste des utilisateurs avec nom, email, rôle et date de création
2. **Given** je suis connecté en tant qu'utilisateur simple **When** je navigue vers mon profil **Then** aucune section "Administration" n'est visible
3. **Given** je suis connecté en tant qu'admin **When** je tente d'accéder à `/admin/users` directement **Then** la page s'affiche normalement
4. **Given** je suis connecté en tant qu'utilisateur simple **When** je tente d'accéder à `/admin/users` directement **Then** je reçois une erreur 403 (accès refusé)

## Pré-requis techniques (migrations)

Cette story inclut les migrations nécessaires à l'ensemble de l'Epic 3 :

- **Migration `user_profiles`** — nouvelle table :
  - `id` (PK, autoincrement)
  - `user_id` (FK → `users.id`, unique, onDelete CASCADE)
  - `sport_id` (FK → `sports.id`, nullable)
  - `level` (enum : `beginner`, `intermediate`, `advanced`, nullable)
  - `objective` (string, nullable — l'utilisateur peut skip)
  - `preferences` (jsonb, default `{}` — voir type `UserPreferences` ci-dessous)
  - `created_at`, `updated_at`

> **Type domaine `UserPreferences`** (stocké en JSONB, validé côté domaine) :
>
> | Clé | Valeurs | Défaut | Onboarding |
> |-----|---------|--------|------------|
> | `speedUnit` | `min_km` \| `km_h` | `min_km` | oui |
> | `distanceUnit` | `km` \| `mi` | `km` | oui |
> | `weightUnit` | `kg` \| `lbs` | `kg` | oui |
> | `weekStartsOn` | `monday` \| `sunday` | `monday` | oui |
> | `dateFormat` | `DD/MM/YYYY` \| `MM/DD/YYYY` | `DD/MM/YYYY` | non (déduit de la locale) |
>
> Le champ est partiel en DB — le domaine merge avec les défauts. Évolutif sans migration.

- **Migration `alter_users`** — ajouter colonne :
  - `onboarding_completed` (boolean, default `false`)

## Tasks / Subtasks

- [ ] Task 1 : Migrations (pré-requis Epic 3)
  - [ ] Créer migration `create_user_profiles_table` avec colonnes ci-dessus
  - [ ] Créer migration `add_onboarding_completed_to_users` (boolean default false)
  - [ ] Vérifier que les migrations passent sur la DB de test

- [ ] Task 2 : Domain — entité UserProfile + type UserPreferences + port UserRepository étendu (AC: #1)
  - [ ] Créer `app/domain/entities/user_profile.ts` (interface pure, avec champ `preferences: UserPreferences`)
  - [ ] Créer le type `UserPreferences` dans `app/domain/entities/user_preferences.ts` avec défauts (`DEFAULT_USER_PREFERENCES`)
  - [ ] Étendre l'entité `User` dans `app/domain/entities/user.ts` pour ajouter `onboardingCompleted: boolean`
  - [ ] Ajouter `findAll(): Promise<User[]>` au port `UserRepository`

- [ ] Task 3 : Repository — implémenter `findAll()` (AC: #1)
  - [ ] Ajouter `findAll()` dans `LucidUserRepository` : retourne tous les users avec `id, fullName, email, role, createdAt`
  - [ ] Le mapper doit inclure `createdAt` dans l'entité User (à étendre si nécessaire)

- [ ] Task 4 : Use Case `ListUsers` (AC: #1)
  - [ ] Créer `app/use_cases/admin/list_users.ts`
  - [ ] Injecter `UserRepository`, appeler `findAll()`
  - [ ] Retourner la liste des utilisateurs

- [ ] Task 5 : Middleware admin (AC: #2, #4)
  - [ ] Créer `app/middleware/admin_middleware.ts`
  - [ ] Vérifie `auth.user.role === 'admin'`, sinon → abort 403
  - [ ] Enregistrer dans `start/kernel.ts` sous le nom `admin`

- [ ] Task 6 : Routes + Controller (AC: #1, #3, #4)
  - [ ] Ajouter route `GET /admin/users` protégée par `middleware.auth()` + `middleware.admin()`
  - [ ] Créer `app/controllers/admin/users_controller.ts`
  - [ ] Méthode `index` : appeler `ListUsers`, passer les données à `inertia.render('Admin/Users/Index')`

- [ ] Task 7 : Page React Admin/Users (AC: #1, #2)
  - [ ] Créer `inertia/pages/Admin/Users/Index.tsx`
  - [ ] Afficher un tableau avec colonnes : Nom, Email, Rôle, Date de création
  - [ ] Utiliser `MainLayout` existant
  - [ ] Ajouter un lien "Administration" dans la navigation du profil, visible uniquement si `user.role === 'admin'` (prop partagée via `auth`)

- [ ] Task 8 : Tests (AC: #1, #2, #3, #4)
  - [ ] `tests/unit/use_cases/admin/list_users.spec.ts` : retourne bien la liste
  - [ ] `tests/functional/admin/users.spec.ts` :
    - GET `/admin/users` en admin → 200 + liste
    - GET `/admin/users` en user simple → 403
    - GET `/admin/users` non connecté → redirect `/login`

## Dev Notes

### Middleware admin — pattern

```typescript
// app/middleware/admin_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    if (auth.user?.role !== 'admin') {
      return response.abort('Accès refusé', 403)
    }
    await next()
  }
}
```

### Type domaine UserPreferences — pattern

```typescript
// app/domain/entities/user_preferences.ts
export type UserPreferences = {
  speedUnit: 'min_km' | 'km_h'
  distanceUnit: 'km' | 'mi'
  weightUnit: 'kg' | 'lbs'
  weekStartsOn: 'monday' | 'sunday'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY'
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  speedUnit: 'min_km',
  distanceUnit: 'km',
  weightUnit: 'kg',
  weekStartsOn: 'monday',
  dateFormat: 'DD/MM/YYYY',
}
```

Le repository merge le JSON partiel de la DB avec `DEFAULT_USER_PREFERENCES` via spread : `{ ...DEFAULT_USER_PREFERENCES, ...row.preferences }`.

### Navigation conditionnelle admin

Le lien "Administration" dans le profil/nav doit être conditionnel. L'info `role` est déjà disponible via les shared props Inertia (cf. Epic 2 — `auth.user` est partagé globalement).

### Table sports existante

La table `sports` existe déjà (migration `1771104621148`). Elle contient : `id`, `name`, `slug`, `default_metrics` (jsonb). Le `sport_id` dans `user_profiles` est une FK vers cette table.

### Structure des routes admin

```typescript
// start/routes.ts — groupe admin
router
  .group(() => {
    router.get('/users', [UsersController, 'index'])
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.admin()])
```

### Fichiers à créer / modifier

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créer    | `database/migrations/xxx_create_user_profiles_table.ts` |
| Créer    | `database/migrations/xxx_add_onboarding_completed_to_users.ts` |
| Créer    | `app/domain/entities/user_profile.ts`            |
| Créer    | `app/domain/entities/user_preferences.ts`        |
| Créer    | `app/use_cases/admin/list_users.ts`              |
| Créer    | `app/middleware/admin_middleware.ts`              |
| Créer    | `app/controllers/admin/users_controller.ts`      |
| Créer    | `inertia/pages/Admin/Users/Index.tsx`            |
| Modifier | `app/domain/entities/user.ts` (ajouter `onboardingCompleted`, `createdAt`) |
| Modifier | `app/domain/interfaces/user_repository.ts` (ajouter `findAll()`) |
| Modifier | `app/repositories/lucid_user_repository.ts` (implémenter `findAll()`) |
| Modifier | `start/routes.ts` (groupe admin)                 |
| Modifier | `start/kernel.ts` (enregistrer admin middleware)  |
| Créer    | `tests/unit/use_cases/admin/list_users.spec.ts`  |
| Créer    | `tests/functional/admin/users.spec.ts`           |

### Conventions

- Fichiers backend : `snake_case.ts`
- Fichiers React : `PascalCase.tsx`
- Controllers ultra-minces : validation → use case → réponse
- Le controller ne touche jamais Lucid directement
- `group.each.setup(async () => testUtils.db().withGlobalTransaction())` pour l'isolation DB dans les tests

### References

- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- [Source: _bmad-output/epics/epic-3-gestion-utilisateurs.md#Story 3.1]
