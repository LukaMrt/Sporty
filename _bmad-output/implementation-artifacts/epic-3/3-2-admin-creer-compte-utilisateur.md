# Story 3.2 : Admin — Créer un compte utilisateur

Status: ready-for-dev

## Story

As a **admin**,
I want **créer un compte pour un nouvel utilisateur**,
so that **je peux inviter des proches à utiliser l'instance** (FR2).

## Acceptance Criteria

1. **Given** je suis sur la page d'administration (`/admin/users`) **When** je clique "Ajouter un utilisateur" **Then** un formulaire s'affiche avec les champs : nom, email, mot de passe temporaire
2. **Given** je remplis le formulaire avec des données valides **When** je soumets **Then** le compte est créé avec le rôle `user` **And** le mot de passe est hashé (géré automatiquement par le modèle AdonisJS) **And** `onboarding_completed` est `false` **And** je suis redirigé vers la liste avec un message de succès
3. **Given** je tente de créer un compte avec un email déjà existant **When** je soumets le formulaire **Then** une erreur claire s'affiche ("Cet email est déjà utilisé")
4. **Given** je soumets le formulaire avec des données invalides (email mal formé, mot de passe < 8 chars, nom vide) **When** la validation s'exécute **Then** des messages d'erreur s'affichent sur les champs concernés

## Tasks / Subtasks

- [ ] Task 1 : Validator VineJS (AC: #3, #4)
  - [ ] Créer `app/validators/admin/create_user_validator.ts`
  - [ ] Champs : `full_name` (string, minLength 2), `email` (email, normalizeEmail, unique), `password` (string, minLength 8)
  - [ ] La règle `unique` de VineJS vérifie directement en DB

- [ ] Task 2 : Use Case `CreateUser` (AC: #2, #3)
  - [ ] Créer `app/use_cases/admin/create_user.ts`
  - [ ] Injecter `UserRepository`
  - [ ] Appeler `userRepository.create({ fullName, email, password, role: 'user' })`
  - [ ] Retourner l'utilisateur créé

- [ ] Task 3 : Repository — s'assurer que `create()` gère bien les champs (AC: #2)
  - [ ] Vérifier que `LucidUserRepository.create()` passe bien les données au modèle Lucid
  - [ ] Le hash du password est automatique via le `@beforeSave` du modèle (mixin AuthFinder)
  - [ ] S'assurer que `role: 'user'` est bien assigné et que `onboarding_completed` est `false` par défaut

- [ ] Task 4 : Routes + Controller (AC: #1, #2, #3, #4)
  - [ ] Ajouter `GET /admin/users/create` et `POST /admin/users` dans le groupe admin
  - [ ] Méthode `create` : `inertia.render('Admin/Users/Create')`
  - [ ] Méthode `store` : valider → use case → `session.flash('success', 'Utilisateur créé')` → redirect `/admin/users`
  - [ ] Attraper erreurs de validation → les erreurs VineJS remontent automatiquement via Inertia

- [ ] Task 5 : Page React Admin/Users/Create (AC: #1, #4)
  - [ ] Créer `inertia/pages/Admin/Users/Create.tsx`
  - [ ] Formulaire avec champs `full_name`, `email`, `password`
  - [ ] `useForm()` d'Inertia pour `processing` et erreurs inline
  - [ ] Bouton "Créer l'utilisateur" + lien retour vers la liste

- [ ] Task 6 : Bouton "Ajouter" sur la page liste (AC: #1)
  - [ ] Modifier `inertia/pages/Admin/Users/Index.tsx` pour ajouter un bouton/lien "Ajouter un utilisateur" pointant vers `/admin/users/create`

- [ ] Task 7 : Tests (AC: #1, #2, #3, #4)
  - [ ] `tests/unit/use_cases/admin/create_user.spec.ts` : crée un user avec role `user`
  - [ ] `tests/functional/admin/create_user.spec.ts` :
    - POST valide → 302 redirect `/admin/users` + user créé en DB
    - POST email dupliqué → erreur "email déjà utilisé"
    - POST données invalides → erreurs de validation
    - POST en user simple → 403
    - POST non connecté → redirect `/login`

## Dev Notes

### Réutilisation du validator register vs nouveau validator

Le `register_validator.ts` de l'Epic 2 valide les mêmes champs mais dans un contexte différent (auto-inscription vs création admin). Créer un validator dédié `create_user_validator.ts` pour éviter le couplage. La règle `unique` sur email est critique ici.

### Validation unique email avec VineJS

```typescript
// app/validators/admin/create_user_validator.ts
import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    full_name: vine.string().minLength(2),
    email: vine.string().email().normalizeEmail().unique({
      table: 'users',
      column: 'email',
    }),
    password: vine.string().minLength(8),
  })
)
```

### Hash automatique — rappel CRITIQUE

Le modèle `User` utilise le mixin `withAuthFinder` qui ajoute un `@beforeSave` automatique pour hasher le password. **NE PAS ajouter de hash manuel dans le use case ou le repository.**

### Routes intentionnelles

```typescript
// Dans le groupe admin existant (story 3.1)
router.get('/users/create', [UsersController, 'create'])
router.post('/users', [UsersController, 'store'])
```

### Fichiers à créer / modifier

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créer    | `app/validators/admin/create_user_validator.ts`  |
| Créer    | `app/use_cases/admin/create_user.ts`             |
| Créer    | `inertia/pages/Admin/Users/Create.tsx`           |
| Modifier | `app/controllers/admin/users_controller.ts` (ajouter `create`, `store`) |
| Modifier | `inertia/pages/Admin/Users/Index.tsx` (bouton "Ajouter") |
| Modifier | `start/routes.ts` (routes create/store)          |
| Créer    | `tests/unit/use_cases/admin/create_user.spec.ts` |
| Créer    | `tests/functional/admin/create_user.spec.ts`     |

### Conventions

- Controller mince : validation VineJS → use case → redirect
- Flash messages pour le feedback utilisateur (pas de toast JS côté serveur)
- `group.each.setup(async () => testUtils.db().withGlobalTransaction())`

### References

- [Source: _bmad-output/epics/epic-3-gestion-utilisateurs.md#Story 3.2]
- [Source: Story 3.1 — pré-requis middleware admin + routes]
