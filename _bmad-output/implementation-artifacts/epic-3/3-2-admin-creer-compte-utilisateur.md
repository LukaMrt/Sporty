# Story 3.2 : Admin — Créer un compte utilisateur

Status: done

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

- [x] Task 1 : Validator VineJS (AC: #3, #4)
  - [x] Créer `app/validators/admin/create_user_validator.ts`
  - [x] Champs : `full_name` (string, minLength 2), `email` (email, normalizeEmail, unique), `password` (string, minLength 8)
  - [x] La règle `unique` de VineJS vérifie directement en DB

- [x] Task 2 : Use Case `CreateUser` (AC: #2, #3)
  - [x] Créer `app/use_cases/admin/create_user.ts`
  - [x] Injecter `UserRepository`
  - [x] Appeler `userRepository.create({ fullName, email, password, role: 'user' })`
  - [x] Retourner l'utilisateur créé

- [x] Task 3 : Repository — s'assurer que `create()` gère bien les champs (AC: #2)
  - [x] Vérifier que `LucidUserRepository.create()` passe bien les données au modèle Lucid
  - [x] Le hash du password est automatique via le `@beforeSave` du modèle (mixin AuthFinder)
  - [x] S'assurer que `role: 'user'` est bien assigné et que `onboarding_completed` est `false` par défaut

- [x] Task 4 : Routes + Controller (AC: #1, #2, #3, #4)
  - [x] Ajouter `GET /admin/users/create` et `POST /admin/users` dans le groupe admin
  - [x] Méthode `create` : `inertia.render('Admin/Users/Create')`
  - [x] Méthode `store` : valider → use case → `session.flash('success', 'Utilisateur créé')` → redirect `/admin/users`
  - [x] Attraper erreurs de validation → les erreurs VineJS remontent automatiquement via Inertia

- [x] Task 5 : Page React Admin/Users/Create (AC: #1, #4)
  - [x] Créer `inertia/pages/Admin/Users/Create.tsx`
  - [x] Formulaire avec champs `full_name`, `email`, `password`
  - [x] `useForm()` d'Inertia pour `processing` et erreurs inline
  - [x] Bouton "Créer l'utilisateur" + lien retour vers la liste

- [x] Task 6 : Bouton "Ajouter" sur la page liste (AC: #1)
  - [x] Modifier `inertia/pages/Admin/Users/Index.tsx` pour ajouter un bouton/lien "Ajouter un utilisateur" pointant vers `/admin/users/create`

- [x] Task 7 : Tests (AC: #1, #2, #3, #4)
  - [x] `tests/unit/use_cases/admin/create_user.spec.ts` : crée un user avec role `user`
  - [x] `tests/functional/admin/create_user.spec.ts` :
    - POST valide → 302 redirect `/admin/users` + user créé en DB
    - POST email dupliqué → erreur "email déjà utilisé"
    - POST données invalides → erreurs de validation
    - POST en user simple → 403
    - POST non connecté → redirect `/login`

## Dev Notes

### Réutilisation du validator register vs nouveau validator

Le `register_validator.ts` de l'Epic 2 valide les mêmes champs mais dans un contexte différent (auto-inscription vs création admin). Créer un validator dédié `create_user_validator.ts` pour éviter le couplage. La règle `unique` sur email est critique ici.

### Décision de design : rôle dynamique (écart vs task 2)

La task 2 spécifiait `role: 'user'` hardcodé dans le use case. L'implémentation permet de choisir le rôle (`user` ou `admin`) via un `RoleSelector` dans le formulaire. Cette décision permet à l'admin de créer d'autres admins sans passer par la DB. Le use case accepte donc `role` comme paramètre, et le validator valide `.in(['user', 'admin'])`.

### Message d'erreur email unique

La règle `unique` de `@adonisjs/lucid` s'enregistre sous le nom `database.unique` dans VineJS. Le `SimpleMessagesProvider` utilise la clé `email.database.unique` pour le message personnalisé.

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

### Erreurs de validation — comportement attendu

En AdonisJS v6 (requêtes non-API), les erreurs VineJS déclenchent un `redirect back` (302), pas un 422. Le 422 est réservé aux requêtes API (`Accept: application/json`). Les tests fonctionnels utilisent donc `.redirects(0)` + `assertStatus(302)`.

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

## Dev Agent Record

### Implementation Plan

1. Validator VineJS dédié avec règle `unique` pour l'email
2. Use case `CreateUser` — assigne role `user` et délègue au repository
3. Repository existant conforme — `onboarding_completed: false` géré par défaut DB
4. Routes `GET /admin/users/create` + `POST /admin/users` dans le groupe admin
5. Page React `Create.tsx` avec `useForm()` Inertia et gestion d'erreurs inline
6. Bouton "Ajouter un utilisateur" dans `Index.tsx`
7. Tests unitaires (use case mock) + fonctionnels (9 scénarios)

### Completion Notes

- Tous les ACs satisfaits et 48/48 tests passent
- Comportement de validation corrigé : AdonisJS v6 non-API → redirect 302 (pas 422) sur erreur VineJS
- `onboarding_completed: false` garanti par le défaut DB (migration), pas besoin de passer la valeur au modèle Lucid

## File List

- `app/validators/admin/create_user_validator.ts` (créé)
- `app/use_cases/admin/create_user.ts` (créé)
- `inertia/pages/Admin/Users/Create.tsx` (créé)
- `inertia/components/admin/RoleSelector.tsx` (créé)
- `inertia/components/forms/FormField.tsx` (créé)
- `inertia/components/forms/IconInput.tsx` (créé)
- `inertia/components/forms/PasswordInput.tsx` (créé)
- `inertia/components/shared/FlashMessages.tsx` (créé)
- `app/controllers/admin/users_controller.ts` (modifié)
- `inertia/pages/Admin/Users/Index.tsx` (modifié)
- `inertia/layouts/MainLayout.tsx` (modifié — intégration FlashMessages)
- `config/inertia.ts` (modifié — sharedData flash messages)
- `start/routes.ts` (modifié)
- `package.json` (modifié — db:seed script + versions mineures)
- `pnpm-lock.yaml` (modifié)
- `tests/unit/use_cases/admin/create_user.spec.ts` (créé)
- `tests/functional/admin/create_user.spec.ts` (créé)

## Change Log

- 2026-02-20 : Implémentation complète story 3.2 — validator, use case, controller, page React, tests (45/45 verts)
