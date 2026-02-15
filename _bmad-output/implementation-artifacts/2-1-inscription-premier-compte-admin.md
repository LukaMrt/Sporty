# Story 2.1 : Inscription & premier compte admin

Status: ready-for-dev

## Story

As a **visiteur (premier utilisateur)**,
I want **m'inscrire sur l'instance Sporty**,
so that **mon compte est créé et je deviens automatiquement administrateur** (FR1).

## Acceptance Criteria

1. **Given** aucun utilisateur n'existe en base **When** je remplis le formulaire d'inscription (nom, email, mot de passe) et je valide **Then** mon compte est créé avec le rôle `admin` **And** mon mot de passe est hashé en argon2 (jamais stocké en clair) **And** je suis automatiquement connecté et redirigé vers l'accueil
2. **Given** au moins un utilisateur existe déjà en base **When** un nouveau visiteur tente d'accéder à la page d'inscription **Then** l'inscription est bloquée (retour 403 ou redirection vers /login)
3. **Given** je soumets le formulaire avec des données invalides (email mal formé, mot de passe trop court < 8 chars) **When** la validation s'exécute **Then** des messages d'erreur clairs s'affichent sur les champs concernés

## Tasks / Subtasks

- [ ] Task 1 : Validator VineJS (AC: #1, #3)
  - [ ] Créer `app/validators/auth/register_validator.ts`
  - [ ] Champs : `full_name` (string, minLength 2), `email` (email, normalizeEmail), `password` (string, minLength 8)
  - [ ] VineJS retourne des erreurs structurées (Inertia les affiche nativement)

- [ ] Task 2 : Domain (AC: #1, #2)
  - [ ] Créer `app/domain/errors/user_already_exists_error.ts`
  - [ ] S'assurer que `app/domain/interfaces/user_repository.ts` expose `countAll(): Promise<number>` et `create(data): Promise<User>`

- [ ] Task 3 : Use Case RegisterUser (AC: #1, #2)
  - [ ] Créer/compléter `app/use_cases/auth/register_user.ts`
  - [ ] Logique : `count = await userRepository.countAll()` → si `count > 0` lancer `UserAlreadyExistsError`
  - [ ] Assigner `role = count === 0 ? 'admin' : 'user'`
  - [ ] Créer l'utilisateur via le repository (argon2 géré par AdonisJS automatiquement via `hash.make()` ou la colonne `#password`)
  - [ ] Retourner l'utilisateur créé

- [ ] Task 4 : Repository User (AC: #1)
  - [ ] Créer/compléter `app/repositories/lucid_user_repository.ts` implémentant `user_repository.ts`
  - [ ] Méthodes nécessaires : `countAll()`, `create(data)`, `findByEmail(email)`

- [ ] Task 5 : Routes + Controller (AC: #1, #2)
  - [ ] Dans `start/routes.ts` : `GET /register` et `POST /register` (routes non protégées)
  - [ ] Créer `app/controllers/auth/register_controller.ts`
  - [ ] GET : si un user existe → redirect `/login` | sinon → `inertia.render('Auth/Register')`
  - [ ] POST : valider via `register_validator`, appeler `RegisterUser`, créer la session via `auth.use('web').login(user)`, redirect `/`
  - [ ] Attraper `UserAlreadyExistsError` → retour 403 ou redirect `/login`

- [ ] Task 6 : Page React Register (AC: #1, #3)
  - [ ] Créer `inertia/pages/Auth/Register.tsx` wrappée dans `AuthLayout`
  - [ ] Formulaire : champs `full_name`, `email`, `password`
  - [ ] Utiliser `useForm()` d'Inertia pour `processing` et les erreurs de validation
  - [ ] Afficher les erreurs inline sur chaque champ via Shadcn Form/Input

- [ ] Task 7 : Tests (AC: #1, #2, #3)
  - [ ] `tests/unit/use_cases/register_user.spec.ts` : premier user → admin, second → bloqué, password hashé
  - [ ] `tests/functional/auth/register.spec.ts` : POST valide → 302 redirect `/`, POST invalide → erreurs, POST si user existe → 403/redirect

## Dev Notes

### Avertissements critiques

- **NE PAS réinstaller `@adonisjs/auth`** — le starter kit AdonisJS Inertia l'inclut déjà avec sessions + guards configurés dans `config/auth.ts`
- **NE PAS reconfigurer argon2** — c'est le driver de hash par défaut d'AdonisJS (`config/hash.ts` pointe vers `drivers.argon`)
- **La table `users` existe déjà** (Story 1.6 — migrations réalisées) avec colonnes : `id`, `email`, `password`, `full_name`, `role`, `created_at`, `updated_at`

### Hash du mot de passe

AdonisJS gère l'argon2 de deux façons selon la config du starter :

```typescript
// Option A — hash manuel dans le use case
import hash from '@adonisjs/core/services/hash'
const hashedPassword = await hash.make(password)

// Option B — colonne `#password` avec beforeSave hook dans le modèle User
// Si le modèle utilise `@beforeSave()`, le hash est automatique
```

Vérifier `app/models/user.ts` pour savoir laquelle est en place avant d'implémenter.

### CSRF dans les formulaires Inertia

Le token CSRF est automatiquement inclus par Inertia via `useForm()`. Ne pas gérer manuellement.

```tsx
// ✅ Correct — Inertia useForm gère le CSRF
const { data, setData, post, processing, errors } = useForm({
  full_name: '',
  email: '',
  password: '',
})
```

### Logique "premier inscrit = admin"

```typescript
// use_cases/auth/register_user.ts
const count = await this.userRepository.countAll()
const role = count === 0 ? 'admin' : 'user'
// Si count > 0 → throw new UserAlreadyExistsError()
```

### AuthLayout

Cette page utilise `AuthLayout` (centré, sans navigation). Selon le starter kit :

```tsx
// inertia/pages/Auth/Register.tsx
Register.layout = (page: React.ReactNode) => <AuthLayout>{page}</AuthLayout>
```

### Fichiers à créer / modifier

| Action  | Fichier                                           |
|---------|---------------------------------------------------|
| Créer   | `app/validators/auth/register_validator.ts`       |
| Créer   | `app/domain/errors/user_already_exists_error.ts`  |
| Créer   | `app/use_cases/auth/register_user.ts`             |
| Créer   | `app/controllers/auth/register_controller.ts`     |
| Créer   | `inertia/pages/Auth/Register.tsx`                 |
| Modifier| `start/routes.ts` (ajouter GET/POST /register)    |
| Modifier| `app/repositories/lucid_user_repository.ts`       |
| Modifier| `app/domain/interfaces/user_repository.ts`        |
| Créer   | `tests/unit/use_cases/register_user.spec.ts`      |
| Créer   | `tests/functional/auth/register.spec.ts`          |

### Conventions à respecter

- Fichiers backend : `snake_case.ts` (ex: `register_user.ts`, `register_controller.ts`)
- Fichiers React : `PascalCase.tsx` (ex: `Register.tsx`)
- Controllers ultra-minces : zéro logique métier, uniquement validation → use case → réponse
- Domain errors : dans `app/domain/errors/`, étendent `Error`
- Anti-pattern interdit : `controller.ts` qui accède directement à Lucid/DB

### Référence codebase Epic 1

Les récents commits montrent la structure utilisée :
- `1ee6977` : migrations users/sessions/sports avec colonnes `role`, `deleted_at`, etc.
- `1bfb076` : structure Clean Architecture confirmée dans `app/`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Premier admin]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow 1 : Onboarding]
- [Source: _bmad-output/epics/epic-2-authentification.md#Story 2.1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List
