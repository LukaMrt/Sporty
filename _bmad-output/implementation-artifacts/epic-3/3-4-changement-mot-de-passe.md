# Story 3.4 : Changement de mot de passe

Status: ready-for-dev

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

- [ ] Task 1 : Validator VineJS (AC: #3, #4)
  - [ ] Créer `app/validators/profile/change_password_validator.ts`
  - [ ] Champs : `current_password` (string), `new_password` (string, minLength 8), `new_password_confirmation` (string, confirmed — doit matcher `new_password`)

- [ ] Task 2 : Use Case `ChangePassword` (AC: #1, #2)
  - [ ] Créer `app/use_cases/profile/change_password.ts`
  - [ ] Vérifier l'ancien mot de passe via `hash.verify(user.password, currentPassword)` ou `UserModel.verifyCredentials(email, currentPassword)`
  - [ ] Si incorrect → throw `InvalidCredentialsError` (réutiliser celui de l'Epic 2)
  - [ ] Si correct → mettre à jour le password via le repository (le hash est automatique via le modèle)

- [ ] Task 3 : Repository — ajouter méthode `updatePassword` ou réutiliser `update` (AC: #1)
  - [ ] S'assurer que `update(id, { password })` sur le repository déclenche bien le `@beforeSave` du modèle pour le hash
  - [ ] Alternative : ajouter `updatePassword(id: number, newPassword: string): Promise<void>` au port si nécessaire

- [ ] Task 4 : Routes + Controller (AC: #1, #2, #3, #4)
  - [ ] Ajouter `PUT /profile/password` dans le groupe authentifié
  - [ ] Créer `app/controllers/profile/password_controller.ts`
  - [ ] Valider → use case → `session.flash('success', 'Mot de passe modifié')` → redirect back
  - [ ] Attraper `InvalidCredentialsError` → `session.flashErrors({ current_password: 'Mot de passe actuel incorrect' })` → redirect back

- [ ] Task 5 : Section React sur la page profil (AC: #1, #2, #3)
  - [ ] Créer `inertia/components/Profile/ChangePasswordForm.tsx` (composant isolé)
  - [ ] Formulaire : `current_password`, `new_password`, `new_password_confirmation`
  - [ ] `useForm()` d'Inertia, `put('/profile/password')`
  - [ ] Erreurs inline sur chaque champ
  - [ ] Flash message de succès affiché au-dessus du formulaire
  - [ ] Intégrer dans la page profil existante (`/profile`) — pour l'instant `Profile/Edit.tsx` est un placeholder Inertia

- [ ] Task 6 : Page profil minimale (AC: #1)
  - [ ] Transformer le placeholder `inertia/pages/Profile/Edit.tsx` en vraie page avec `MainLayout`
  - [ ] Pour l'instant : titre "Mon profil" + section "Changer mon mot de passe" avec le composant `ChangePasswordForm`
  - [ ] Les sections profil sportif seront ajoutées en Story 3.6

- [ ] Task 7 : Tests (AC: #1, #2, #3, #4)
  - [ ] `tests/unit/use_cases/profile/change_password.spec.ts` : ancien mdp correct → OK, ancien incorrect → erreur
  - [ ] `tests/functional/profile/change_password.spec.ts` :
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
