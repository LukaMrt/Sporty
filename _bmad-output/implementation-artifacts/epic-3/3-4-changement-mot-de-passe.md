# Story 3.4 : Changement de mot de passe

Status: done

## Story

As a **utilisateur connecté**,
I want **modifier mon mot de passe**,
so that **je peux sécuriser mon compte ou changer le mot de passe temporaire donné par l'admin** (FR6).

## Acceptance Criteria

1. **Given** je suis sur ma page de profil **When** je remplis le formulaire de changement de mot de passe (ancien mot de passe, nouveau, confirmation) **Then** mon mot de passe est mis à jour **And** un feedback confirme le changement ("Mot de passe modifié")
2. **Given** je saisis un ancien mot de passe incorrect **When** je soumets le formulaire **Then** une erreur s'affiche ("Mot de passe actuel incorrect")
3. **Given** le nouveau mot de passe et la confirmation ne correspondent pas **When** je soumets le formulaire **Then** une erreur s'affiche ("Les mots de passe ne correspondent pas")
4. **Given** le nouveau mot de passe fait moins de 8 caractères **When** je soumets le formulaire **Then** une erreur de validation s'affiche

## Tasks / Subtasks

- [x] Task 1 : Validator VineJS (AC: #3, #4)
  - [x] Créer `app/validators/profile/change_password_validator.ts`
  - [x] Champs : `current_password` (string), `new_password` (string, minLength 8), `new_password_confirmation` (string, confirmed — doit matcher `new_password`)

- [x] Task 2 : Use Case `ChangePassword` (AC: #1, #2)
  - [x] Créer `app/use_cases/profile/change_password.ts`
  - [x] Vérifier l'ancien mot de passe via `hash.verify(user.password, currentPassword)` ou `UserModel.verifyCredentials(email, currentPassword)`
  - [x] Si incorrect → throw `InvalidCredentialsError` (réutiliser celui de l'Epic 2)
  - [x] Si correct → mettre à jour le password via le repository (le hash est automatique via le modèle)

- [x] Task 3 : Repository — ajouter méthode `updatePassword` ou réutiliser `update` (AC: #1)
  - [x] S'assurer que `update(id, { password })` sur le repository déclenche bien le `@beforeSave` du modèle pour le hash
  - [x] Alternative : ajouter `verifyPassword(id: number, password: string): Promise<boolean>` au port

- [x] Task 4 : Routes + Controller (AC: #1, #2, #3, #4)
  - [x] Ajouter `PUT /profile/password` dans le groupe authentifié
  - [x] Créer `app/controllers/profile/password_controller.ts`
  - [x] Valider → use case → `session.flash('success', 'Mot de passe modifié')` → redirect back
  - [x] Attraper `InvalidCredentialsError` → `session.flashErrors({ current_password: 'Mot de passe actuel incorrect' })` → redirect back

- [x] Task 5 : Section React sur la page profil (AC: #1, #2, #3)
  - [x] Créer `inertia/components/Profile/ChangePasswordForm.tsx` (composant isolé)
  - [x] Formulaire : `current_password`, `new_password`, `new_password_confirmation`
  - [x] `useForm()` d'Inertia, `put('/profile/password')`
  - [x] Erreurs inline sur chaque champ
  - [x] Flash message de succès affiché au-dessus du formulaire
  - [x] Intégrer dans la page profil existante (`/profile`) — pour l'instant `Profile/Edit.tsx` est un placeholder Inertia

- [x] Task 6 : Page profil minimale (AC: #1)
  - [x] Transformer le placeholder `inertia/pages/Profile/Edit.tsx` en vraie page avec `MainLayout`
  - [x] Pour l'instant : titre "Mon profil" + section "Changer mon mot de passe" avec le composant `ChangePasswordForm`
  - [x] Les sections profil sportif seront ajoutées en Story 3.6

- [x] Task 7 : Tests (AC: #1, #2, #3, #4)
  - [x] `tests/unit/use_cases/profile/change_password.spec.ts` : ancien mdp correct → OK, ancien incorrect → erreur
  - [x] `tests/functional/profile/change_password.spec.ts` :
    - PUT valide → password changé (vérifiable via login avec nouveau mdp)
    - PUT ancien mdp faux → erreur "Mot de passe actuel incorrect"
    - PUT confirmation ne match pas → erreur validation
    - PUT nouveau mdp < 8 chars → erreur validation
    - PUT non connecté → redirect `/login`

## Dev Notes

### Vérification de l'ancien mot de passe

AdonisJS v6 avec AuthFinder : utiliser `hash.verify()` pour vérifier le mot de passe actuel.

```typescript
import hash from '@adonisjs/core/services/hash'

const isValid = await hash.verify(user.password, currentPassword)
if (!isValid) {
  throw new InvalidCredentialsError()
}
```

**NE PAS utiliser `auth.use('web').attempt()`** pour vérifier — ça crée une nouvelle session. On vérifie juste le hash.

### VineJS `confirmed` rule

```typescript
new_password: vine.string().minLength(8).confirmed({
  confirmationField: 'new_password_confirmation',
}),
```

### Flash messages avec Inertia

```typescript
// Controller
session.flash('success', 'Mot de passe modifié')
response.redirect().back()

// React — accès via usePage
const { flash } = usePage<{ flash: { success?: string } }>().props
```

### Décision architecture : `verifyPassword` sur le port

La vérification du hash (`hash.verify`) est de l'infra AdonisJS. Pour respecter la règle `use-cases-only-domain`, la méthode `verifyPassword(userId, password)` a été ajoutée au port `UserRepository` et implémentée dans `LucidUserRepository`. Le use case reste agnostique de `hash`.

### Règle ESLint désactivée

`@adonisjs/prefer-adonisjs-inertia-link` désactivée car `@adonisjs/inertia` n'exporte pas `/react` dans la version installée. `Link` reste importé depuis `@inertiajs/react`.

### Fichiers à créer / modifier

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créer    | `app/validators/profile/change_password_validator.ts` |
| Créer    | `app/use_cases/profile/change_password.ts`       |
| Créer    | `app/controllers/profile/password_controller.ts` |
| Créer    | `inertia/components/Profile/ChangePasswordForm.tsx` |
| Modifier | `inertia/pages/Profile/Edit.tsx` (remplacer placeholder) |
| Modifier | `start/routes.ts` (PUT /profile/password)        |
| Créer    | `tests/unit/use_cases/profile/change_password.spec.ts` |
| Créer    | `tests/functional/profile/change_password.spec.ts` |

### References

- [Source: _bmad-output/epics/epic-3-gestion-utilisateurs.md#Story 3.4]
- [Source: Story 2.2 — InvalidCredentialsError existant]

## Dev Agent Record

### Implementation Plan

1. Validator VineJS avec `confirmed()` pour la confirmation du mot de passe
2. Méthode `verifyPassword` ajoutée au port `UserRepository` et implémentée dans `LucidUserRepository` (hash via `@adonisjs/core/services/hash`)
3. Use case `ChangePassword` : délègue la vérification au repository, lève `InvalidCredentialsError` si incorrect
4. Controller `PasswordController` : thin controller, catch `InvalidCredentialsError` → flashErrors
5. Route `PUT /profile/password` dans le groupe authentifié
6. Composant React `ChangePasswordForm` avec `useForm()` Inertia
7. Page profil minimale avec `ChangePasswordForm`
8. Tests unitaires (3 cas) + fonctionnels (5 cas) — tous verts

### Completion Notes

- Tous les ACs satisfaits et tous les tests passent (77 tests verts au total)
- `verifyPassword` ajouté au port `UserRepository` → tous les mocks existants mis à jour
- Règle ESLint `@adonisjs/prefer-adonisjs-inertia-link` désactivée (package n'exporte pas `/react`)
- AdonisJS retourne 302 (redirect + flash) pour les erreurs de validation sur form submissions — comportement attendu avec Inertia

### Debug Log

- Tests validation (AC #3, #4) : corrigés de 422 → 302 + `assertFlashMessage('errorsBag', { E_VALIDATION_ERROR: ... })` car AdonisJS v6 redirige les erreurs VineJS sur form submissions

## File List

### Créés
- `app/validators/profile/change_password_validator.ts`
- `app/use_cases/profile/change_password.ts`
- `app/controllers/profile/password_controller.ts`
- `inertia/components/Profile/ChangePasswordForm.tsx`
- `tests/unit/use_cases/profile/change_password.spec.ts`
- `tests/functional/profile/change_password.spec.ts`

### Modifiés
- `app/domain/interfaces/user_repository.ts` (ajout `verifyPassword`)
- `app/repositories/lucid_user_repository.ts` (implémentation `verifyPassword`)
- `start/routes.ts` (ajout `PUT /profile/password`)
- `inertia/pages/Profile/Edit.tsx` (remplace placeholder)
- `eslint.config.js` (désactive `@adonisjs/prefer-adonisjs-inertia-link`)
- `tests/unit/use_cases/admin/create_user.spec.ts` (mock `verifyPassword`)
- `tests/unit/use_cases/admin/delete_user.spec.ts` (mock `verifyPassword`)
- `tests/unit/use_cases/admin/get_user.spec.ts` (mock `verifyPassword`)
- `tests/unit/use_cases/admin/list_users.spec.ts` (mock `verifyPassword`)
- `tests/unit/use_cases/admin/update_user.spec.ts` (mock `verifyPassword`)
- `tests/unit/use_cases/login_user.spec.ts` (mock `verifyPassword`)
- `tests/unit/use_cases/register_user.spec.ts` (mock `verifyPassword`)

## Change Log

- 2026-02-24 : Implémentation story 3.4 — changement de mot de passe (77 tests verts, `pnpm run ci` vert)
