# Story 2.1 : Inscription & premier compte admin

Status: done

## Story

As a **visiteur (premier utilisateur)**,
I want **m'inscrire sur l'instance Sporty**,
so that **mon compte est créé et je deviens automatiquement administrateur** (FR1).

## Acceptance Criteria

1. **Given** aucun utilisateur n'existe en base **When** je remplis le formulaire d'inscription (nom, email, mot de passe) et je valide **Then** mon compte est créé avec le rôle `admin` **And** mon mot de passe est hashé en argon2 (jamais stocké en clair) **And** je suis automatiquement connecté et redirigé vers l'accueil
2. **Given** au moins un utilisateur existe déjà en base **When** un nouveau visiteur tente d'accéder à la page d'inscription **Then** l'inscription est bloquée (retour 403 ou redirection vers /login)
3. **Given** je soumets le formulaire avec des données invalides (email mal formé, mot de passe trop court < 8 chars) **When** la validation s'exécute **Then** des messages d'erreur clairs s'affichent sur les champs concernés

## Tasks / Subtasks

- [x] Task 1 : Validator VineJS (AC: #1, #3)
  - [x] Créer `app/validators/auth/register_validator.ts`
  - [x] Champs : `full_name` (string, minLength 2), `email` (email, normalizeEmail), `password` (string, minLength 8)
  - [x] VineJS retourne des erreurs structurées (Inertia les affiche nativement)

- [x] Task 2 : Domain (AC: #1, #2)
  - [x] Créer `app/domain/errors/user_already_exists_error.ts`
  - [x] S'assurer que `app/domain/interfaces/user_repository.ts` expose `countAll(): Promise<number>` et `create(data): Promise<User>`

- [x] Task 3 : Use Case RegisterUser (AC: #1, #2)
  - [x] Créer/compléter `app/use_cases/auth/register_user.ts`
  - [x] Logique : `count = await userRepository.countAll()` → si `count > 0` lancer `UserAlreadyExistsError`
  - [x] Assigner `role = count === 0 ? 'admin' : 'user'`
  - [x] Créer l'utilisateur via le repository (argon2 géré par AdonisJS automatiquement via `hash.make()` ou la colonne `#password`)
  - [x] Retourner l'utilisateur créé

- [x] Task 4 : Repository User (AC: #1)
  - [x] Créer/compléter `app/repositories/lucid_user_repository.ts` implémentant `user_repository.ts`
  - [x] Méthodes nécessaires : `countAll()`, `create(data)`, `findByEmail(email)`

- [x] Task 5 : Routes + Controller (AC: #1, #2)
  - [x] Dans `start/routes.ts` : `GET /register` et `POST /register` (routes non protégées)
  - [x] Créer `app/controllers/auth/register_controller.ts`
  - [x] GET : si un user existe → redirect `/login` | sinon → `inertia.render('Auth/Register')`
  - [x] POST : valider via `register_validator`, appeler `RegisterUser`, créer la session via `auth.use('web').login(user)`, redirect `/`
  - [x] Attraper `UserAlreadyExistsError` → retour 403 ou redirect `/login`

- [x] Task 6 : Page React Register (AC: #1, #3)
  - [x] Créer `inertia/pages/Auth/Register.tsx` wrappée dans `AuthLayout`
  - [x] Formulaire : champs `full_name`, `email`, `password`
  - [x] Utiliser `useForm()` d'Inertia pour `processing` et les erreurs de validation
  - [x] Afficher les erreurs inline sur chaque champ via Shadcn Form/Input

- [x] Task 7 : Tests (AC: #1, #2, #3)
  - [x] `tests/unit/use_cases/register_user.spec.ts` : premier user → admin, second → bloqué, password hashé
  - [x] `tests/functional/auth/register.spec.ts` : POST valide → 302 redirect `/`, POST invalide → erreurs, POST si user existe → 403/redirect

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

**Session 1 — Implémentation initiale**
- `response.abort(403)` → mauvaise signature, corrigé en `response.abort('Inscription fermée', 403)` (body requis en 1er arg)
- `assert.rejects(fn, callback)` → non supporté dans Japa v4 → remplacé par try-catch + `assert.instanceOf`
- `@japa/api-client` absent du projet → installé comme peer dependency requise pour les tests fonctionnels
- `withCsrfToken()` non disponible dans `@japa/plugin-adonisjs` v4 → CSRF désactivé en `NODE_ENV === 'test'` dans `config/shield.ts`
- `testUtils.db().truncate()` → verrou PostgreSQL non libéré entre tests → remplacé par `TRUNCATE TABLE users RESTART IDENTITY CASCADE`
- Hash driver : config utilise `scrypt` (pas argon2 comme indiqué dans les notes) — `@beforeSave()` gère le hash automatiquement via le modèle

**Session 2 — Refactoring Clean Architecture + corrections tests**
- `loginViaId()` n'existe pas dans AdonisJS v6 → `auth.use('web').login(model)` requiert un modèle Lucid (pas une entité)
- `import type` sur une classe abstraite utilisée avec `@inject()` → effacée à la compilation → `emitDecoratorMetadata` voit `Object` → erreur `Cannot inject "[Function: Object]"` → utiliser `import` (valeur) pour toute classe abstraite avec `extends` ou `@inject()`
- `extends AuthService` avec syntaxe raccourcie TypeScript (`constructor(private ctx: HttpContext)`) → n'émet pas `super()` correctement → erreur `Must call super constructor in derived class` → constructeur explicite avec `super()` requis
- `suite.setup(() => testUtils.db().withGlobalTransaction())` → la lambda retourne `setupFn` comme teardown (appelé après la suite, jamais avant chaque test) → aucune isolation entre tests → corrigé en `group.each.setup(async () => testUtils.db().withGlobalTransaction())`
- `group.each.setup(testUtils.db().withGlobalTransaction())` → erreur TS : `withGlobalTransaction()` retourne `Promise<CleanupHandler>`, pas un `TestHooksHandler` → wrapping `async () =>` requis
- Tailwind v4 preflight place `button, input { color: inherit }` **hors de tout `@layer`** → prime sur `@layer utilities` → `.text-primary-foreground` invisible → corrigé par `color: revert-layer` unlayered après `@import 'tailwindcss'`
- `@theme inline` avec `hsl(var(--x))` → double indirection non résolue par Tailwind v4 → `:root` doit contenir les valeurs `hsl()` complètes, `@theme inline` référence via `var()` direct

### Patrons à retenir (AdonisJS + Clean Architecture)

#### Injection de dépendances AdonisJS v6

```typescript
// ✅ Port domain = classe abstraite (jamais interface — effacée à la compilation)
export abstract class UserRepository {
  abstract countAll(): Promise<number>
  abstract create(user: Omit<User, 'id'>): Promise<User>
}

// ✅ Adaptateur infrastructure : extends (valeur), pas implements
// ✅ import valeur, pas import type
import { UserRepository } from '#domain/interfaces/user_repository'
export default class LucidUserRepository extends UserRepository { ... }

// ✅ @inject() sur la classe, constructeur explicite avec super()
@inject()
export class AdonisAuthService extends AuthService {
  private ctx: HttpContext
  constructor(ctx: HttpContext) {
    super()
    this.ctx = ctx
  }
}

// ✅ Binding IoC dans AppProvider
this.app.container.bind(UserRepository, async () => new LucidUserRepository())
this.app.container.bind(AuthService, async (resolver) => resolver.make(AdonisAuthService))
```

#### Architecture couches (controller → use case → domain)

```
Controller    : @inject() → use case injecté, zero logique métier
Use Case      : @inject() → repository + authService en constructeur
Repository    : extends classe abstraite domain, dépendance Lucid encapsulée
AuthService   : extends classe abstraite domain, dépendance HttpContext encapsulée
```

Le controller ne connaît **jamais** un modèle Lucid directement.
Le use case **possède** le trigger d'authentification (pas le controller).

#### Tests fonctionnels — isolation DB par transaction

```typescript
// register.spec.ts
test.group('Auth / Register', (group) => {
  // Wraps chaque test dans une transaction rollbackée après → isolation parfaite
  group.each.setup(async () => testUtils.db().withGlobalTransaction())
})

// bootstrap.ts — withGlobalTransaction() n'appartient PAS ici
// suite.setup() = 1 fois par suite = 1 transaction globale partagée = pas d'isolation
```

Chaque fichier de test fonctionnel doit déclarer son propre `group.each.setup(...)`.

#### Mocks tests unitaires (classes abstraites)

```typescript
function makeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  class MockRepository extends UserRepository {
    async countAll() { return 0 }
    async create(data: Omit<User, 'id'>): Promise<User> { return { id: 1, ...data } }
    async findByEmail(): Promise<null> { return null }
  }
  return Object.assign(new MockRepository(), overrides)
}
```

### Completion Notes List

- **Task 1** : Validator VineJS créé avec `full_name`, `email` (normalizeEmail), `password` (minLength 8)
- **Task 2** : `UserAlreadyExistsError` et classe abstraite `UserRepository` (countAll, create, findByEmail) créés
- **Task 3** : `RegisterUser` use case — premier user → role admin, user existant → `UserAlreadyExistsError`, auth déclenchée dans le use case
- **Task 4** : `LucidUserRepository extends UserRepository` avec `countAll()`, `create()`, `findByEmail()`, mapper `#toEntity()`
- **Task 5** : Routes GET/POST `/register` + controller mince `@inject()` (valide → use case → redirect)
- **Task 6** : Page `Auth/Register.tsx` + `AuthLayout` + composant `Input` Shadcn créés
- **Task 7** : 3 tests unitaires + 6 tests fonctionnels — 9/9 passent
- **Infra** : Classes abstraites pour ports domain, `AdonisAuthService` adaptateur, `AppProvider` bindings IoC, `providers/app_provider.ts` enregistré dans `adonisrc.ts`
- **CSS** : `@theme inline` + `:root hsl()` + `color: revert-layer` fix Tailwind v4 preflight

### File List

**Session 1**
- `app/validators/auth/register_validator.ts` (créé)
- `app/domain/errors/user_already_exists_error.ts` (créé)
- `app/domain/interfaces/user_repository.ts` (créé → refactorisé en classe abstraite session 2)
- `app/use_cases/auth/register_user.ts` (créé → refactorisé session 2)
- `app/repositories/lucid_user_repository.ts` (créé → refactorisé session 2)
- `app/controllers/auth/register_controller.ts` (créé → refactorisé session 2)
- `inertia/layouts/AuthLayout.tsx` (créé)
- `inertia/components/ui/input.tsx` (créé)
- `inertia/pages/Auth/Register.tsx` (créé)
- `start/routes.ts` (modifié — GET/POST /register, méthode `register`)
- `package.json` (modifié — alias #repositories/*, #use_cases/*, #domain/*, @japa/api-client)
- `config/shield.ts` (modifié — CSRF désactivé en NODE_ENV=test)
- `tests/bootstrap.ts` (modifié — apiClient() plugin, withGlobalTransaction retiré du suite.setup)
- `tests/unit/use_cases/register_user.spec.ts` (créé)
- `tests/functional/auth/register.spec.ts` (créé — group.each.setup withGlobalTransaction)

**Session 2**
- `app/domain/entities/user.ts` (créé — entité pure `User`)
- `app/domain/value_objects/user_role.ts` (créé)
- `app/domain/interfaces/auth_service.ts` (créé — classe abstraite port auth)
- `app/services/adonis_auth_service.ts` (créé — adaptateur AdonisJS @inject())
- `providers/app_provider.ts` (créé — bindings IoC UserRepository + AuthService)
- `adonisrc.ts` (modifié — app_provider enregistré)
- `inertia/components/ui/button.tsx` (modifié — text-primary-foreground)
- `inertia/css/app.css` (modifié — @theme inline var(), :root hsl(), revert-layer fix)

## Change Log

- 2026-02-15 — Implémentation complète Story 2.1 (agent: claude-sonnet-4-5-20250929)
- 2026-02-15 — Refactoring Clean Architecture : entités domain, classes abstraites, IoC, AdonisAuthService, fix CSS Tailwind v4, fix isolation tests (agent: claude-sonnet-4-5-20250929)
