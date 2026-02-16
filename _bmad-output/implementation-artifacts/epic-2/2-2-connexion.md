# Story 2.2 : Connexion

Status: dev-complete

## Story

As a **utilisateur inscrit**,
I want **me connecter avec mon email et mot de passe**,
so that **j'accède à mon espace personnel** (FR4).

## Acceptance Criteria

1. **Given** je suis sur la page de connexion **When** je saisis un email et mot de passe valides **Then** une session cookie est créée avec protection CSRF **And** je suis redirigé vers la page d'accueil
2. **Given** je saisis un email ou mot de passe incorrect **When** je soumets le formulaire **Then** un message d'erreur générique s'affiche ("Identifiants incorrects") sans révéler si c'est l'email ou le mot de passe qui est faux
3. **Given** je ne suis pas connecté **When** j'essaie d'accéder à n'importe quelle page protégée **Then** je suis redirigé vers `/login`

## Tasks / Subtasks

- [x] Task 1 : Validator VineJS (AC: #1, #2)
  - [x] Créer `app/validators/auth/login_validator.ts`
  - [x] Champs : `email` (email, normalizeEmail), `password` (string, minLength 1)
  - [x] Validation légère côté serveur — la vérification des credentials est dans le use case

- [x] Task 2 : Use Case LoginUser (AC: #1, #2)
  - [x] Créer `app/use_cases/auth/login_user.ts`
  - [x] Utiliser `auth.use('web').attempt(email, password)` — vérifie les credentials + crée la session
  - [x] En cas d'échec (`InvalidCredentialsException`) → lancer une erreur domain neutre
  - [x] NE JAMAIS différencier "email inexistant" de "mauvais mot de passe" dans le message

- [x] Task 3 : Middleware auth (AC: #3)
  - [x] Vérifier/créer `app/middleware/auth_middleware.ts`
  - [x] Appliquer le middleware sur toutes les routes protégées (groupe dans `start/routes.ts`)
  - [x] Si non authentifié → redirect vers `/login`

- [x] Task 4 : Routes + Controller (AC: #1, #2)
  - [x] Dans `start/routes.ts` : `GET /login`, `POST /login` (non protégées)
  - [x] Groupe de routes protégées wrappé par le middleware auth
  - [x] Créer `app/controllers/auth/login_controller.ts`
  - [x] GET : si déjà authentifié → redirect `/` | sinon → `inertia.render('Auth/Login')`
  - [x] POST : valider, appeler `LoginUser`, redirect `/`

- [x] Task 5 : Page React Login (AC: #1, #2)
  - [x] Créer `inertia/pages/Auth/Login.tsx` wrappée dans `AuthLayout`
  - [x] Formulaire : champs `email`, `password`
  - [x] `useForm()` d'Inertia pour `processing` et erreurs
  - [x] Afficher l'erreur générique sur le formulaire (pas sur un champ spécifique)
  - [x] Lien vers `/register` si aucun compte (uniquement si `canRegister` prop passée par le controller)

- [x] Task 6 : Tests (AC: #1, #2, #3)
  - [x] `tests/unit/use_cases/login_user.spec.ts` : credentials valides → session, credentials invalides → erreur neutre
  - [x] `tests/functional/auth/login.spec.ts` : POST valide → 302 redirect `/`, POST invalide → erreur générique, route protégée sans session → redirect `/login`

## Dev Notes

### Mécanisme de connexion AdonisJS

```typescript
// app/use_cases/auth/login_user.ts
import { HttpContext } from '@adonisjs/core/http'

export default class LoginUser {
  async execute({ auth, email, password }: { auth: HttpContext['auth']; email: string; password: string }) {
    await auth.use('web').attempt(email, password)
    // Lève InvalidCredentialsException si échec — l'attraper dans le controller
  }
}
```

### Erreur générique — sécurité

**CRITIQUE :** Ne jamais révéler si l'email existe ou non.

```typescript
// app/controllers/auth/login_controller.ts
try {
  await new LoginUser().execute({ auth, email, password })
  return response.redirect('/')
} catch {
  // Même message pour email inexistant ET mauvais mot de passe
  return back().withErrors({ form: 'Identifiants incorrects' })
}
```

### Middleware auth sur les routes protégées

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Routes publiques
router.get('/login', ...)
router.post('/login', ...)
router.get('/register', ...)
router.post('/register', ...)

// Routes protégées
router.group(() => {
  router.get('/', [DashboardController, 'index'])
  // ... autres routes protégées
}).use(middleware.auth())
```

### Redirection post-login

Après connexion réussie → redirect vers `/` (le dashboard de Story 2.5).

### Page Login — affichage de l'erreur

L'erreur générique n'est PAS associée à un champ. Elle s'affiche au niveau du formulaire :

```tsx
// inertia/pages/Auth/Login.tsx
const { errors } = usePage<{ errors: { form?: string } }>().props
// ...
{errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
```

### AuthLayout

```tsx
Login.layout = (page: React.ReactNode) => <AuthLayout>{page}</AuthLayout>
```

### Fichiers à créer / modifier

| Action  | Fichier                                        |
|---------|------------------------------------------------|
| Créer   | `app/validators/auth/login_validator.ts`       |
| Créer   | `app/use_cases/auth/login_user.ts`             |
| Créer   | `app/controllers/auth/login_controller.ts`     |
| Créer   | `inertia/pages/Auth/Login.tsx`                 |
| Modifier| `start/routes.ts` (GET/POST /login + groupe auth) |
| Vérifier| `app/middleware/auth_middleware.ts` (existe dans starter) |
| Créer   | `tests/unit/use_cases/login_user.spec.ts`      |
| Créer   | `tests/functional/auth/login.spec.ts`          |

### Conventions

- Controller mince : validation VineJS → use case → redirect. Zéro logique.
- Ne jamais mettre de logique métier dans le controller.
- La session est créée par AdonisJS via `auth.use('web').attempt()` — pas besoin de gérer manuellement le cookie.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Gestion d'erreurs]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow 3 : Consultation dashboard]
- [Source: _bmad-output/epics/epic-2-authentification.md#Story 2.2]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

- AdonisJS v6 n'a pas `attempt()` sur le session guard → implémenté via `UserModel.findBy()` + `hash.verify()` + `auth.login()`
- `response.redirect().back().withErrors()` n'existe pas en AdonisJS v6 → `session.flashErrors()` + `response.redirect().back()`
- DB de test nécessitait `NODE_ENV=test node ace migration:run`

### Completion Notes List

- Ajout de `attempt(email, password)` au port `AuthService` et implémentation dans `AdonisAuthService`
- Création de `InvalidCredentialsError` dans le domain
- Erreur générique unique pour email inexistant ET mauvais mot de passe (AC #2)
- Route `/` protégée par middleware auth → redirect `/login` si non authentifié (AC #3)
- Mise à jour du mock `AuthService` dans `register_user.spec.ts` pour inclure `attempt`
- Formatage de `.dependency-cruiser.cjs` (pré-existant, non formaté)

### File List

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créé     | `app/validators/auth/login_validator.ts`         |
| Créé     | `app/use_cases/auth/login_user.ts`               |
| Créé     | `app/controllers/auth/login_controller.ts`       |
| Créé     | `app/domain/errors/invalid_credentials_error.ts` |
| Créé     | `inertia/pages/Auth/Login.tsx`                   |
| Créé     | `tests/unit/use_cases/login_user.spec.ts`        |
| Créé     | `tests/functional/auth/login.spec.ts`            |
| Modifié  | `app/domain/interfaces/auth_service.ts`          |
| Modifié  | `app/services/adonis_auth_service.ts`            |
| Modifié  | `start/routes.ts`                                |
| Modifié  | `tests/unit/use_cases/register_user.spec.ts`     |
| Formaté  | `.dependency-cruiser.cjs`                        |
