# Story 3.3 : Admin — Modifier et supprimer un compte

Status: ready-for-dev

## Story

As a **admin**,
I want **modifier les infos d'un utilisateur ou supprimer son compte**,
so that **je garde le contrôle sur les comptes de mon instance** (FR3).

## Acceptance Criteria

1. **Given** je suis sur la liste des utilisateurs **When** je clique sur un utilisateur **Then** je vois ses détails et je peux modifier son nom et son email
2. **Given** je modifie le nom ou l'email d'un utilisateur **When** je sauvegarde **Then** les modifications sont enregistrées **And** un message de succès s'affiche
3. **Given** je clique sur "Réinitialiser le mot de passe" **When** je saisis un nouveau mot de passe temporaire (min 8 chars) **Then** le mot de passe de l'utilisateur est mis à jour
4. **Given** je modifie l'email avec un email déjà utilisé par un autre compte **When** je sauvegarde **Then** une erreur s'affiche ("Cet email est déjà utilisé")
5. **Given** je clique sur "Supprimer" sur un compte utilisateur **When** je confirme la suppression **Then** le compte est supprimé de la base
6. **Given** je tente de supprimer mon propre compte admin **When** je clique "Supprimer" **Then** l'action est bloquée ("Impossible de supprimer votre propre compte")

## Tasks / Subtasks

- [ ] Task 1 : Domain — étendre le port UserRepository (AC: #1, #2, #5)
  - [ ] Ajouter `findById(id: number): Promise<User | null>` au port `UserRepository`
  - [ ] Ajouter `update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User>` au port
  - [ ] Ajouter `delete(id: number): Promise<void>` au port

- [ ] Task 2 : Repository — implémenter les nouvelles méthodes (AC: #1, #2, #5)
  - [ ] `findById()` dans `LucidUserRepository`
  - [ ] `update()` dans `LucidUserRepository` — met à jour uniquement les champs fournis
  - [ ] `delete()` dans `LucidUserRepository` — hard delete

- [ ] Task 3 : Validators (AC: #2, #3, #4)
  - [ ] Créer `app/validators/admin/update_user_validator.ts` : `full_name` (optional string minLength 2), `email` (optional email, unique sauf l'user courant)
  - [ ] Créer `app/validators/admin/reset_password_validator.ts` : `password` (string, minLength 8)

- [ ] Task 4 : Use Cases (AC: #2, #3, #5, #6)
  - [ ] Créer `app/use_cases/admin/update_user.ts` : met à jour nom/email
  - [ ] Créer `app/use_cases/admin/reset_user_password.ts` : met à jour le password (le hash est automatique via le modèle)
  - [ ] Créer `app/use_cases/admin/delete_user.ts` : vérifie que l'admin ne se supprime pas lui-même → sinon throw `CannotDeleteSelfError` → puis supprime

- [ ] Task 5 : Domain error (AC: #6)
  - [ ] Créer `app/domain/errors/cannot_delete_self_error.ts`

- [ ] Task 6 : Routes + Controller (AC: #1-#6)
  - [ ] Ajouter dans le groupe admin :
    - `GET /admin/users/:id/edit` → `UsersController.edit`
    - `PUT /admin/users/:id` → `UsersController.update`
    - `PUT /admin/users/:id/password` → `UsersController.resetPassword`
    - `DELETE /admin/users/:id` → `UsersController.destroy`
  - [ ] `edit` : charger le user par ID, render `Admin/Users/Edit`
  - [ ] `update` : valider → use case → redirect avec succès
  - [ ] `resetPassword` : valider → use case → redirect avec succès
  - [ ] `destroy` : use case → redirect (ou 403 si self-delete)

- [ ] Task 7 : Page React Admin/Users/Edit (AC: #1, #2, #3, #6)
  - [ ] Créer `inertia/pages/Admin/Users/Edit.tsx`
  - [ ] Formulaire édition : `full_name`, `email` (pré-remplis)
  - [ ] Section séparée : "Réinitialiser le mot de passe" avec champ `password`
  - [ ] Bouton "Supprimer le compte" avec confirmation (dialog ou confirm natif)
  - [ ] Désactiver le bouton supprimer si c'est le user connecté (comparer `user.id` avec `auth.user.id`)

- [ ] Task 8 : Lien depuis la liste (AC: #1)
  - [ ] Modifier `Admin/Users/Index.tsx` : chaque ligne de la liste est cliquable → lien vers `/admin/users/:id/edit`

- [ ] Task 9 : Tests (AC: #1-#6)
  - [ ] `tests/unit/use_cases/admin/update_user.spec.ts`
  - [ ] `tests/unit/use_cases/admin/delete_user.spec.ts` : suppression OK + self-delete bloqué
  - [ ] `tests/functional/admin/manage_user.spec.ts` :
    - PUT valide → user modifié en DB
    - PUT email dupliqué → erreur
    - PUT password → password mis à jour (vérifiable via `verifyCredentials`)
    - DELETE user → user supprimé
    - DELETE self → 403
    - Toutes les routes en user simple → 403

## Dev Notes

### Unique email sauf soi-même (VineJS)

```typescript
// app/validators/admin/update_user_validator.ts
email: vine.string().email().normalizeEmail().unique({
  table: 'users',
  column: 'email',
  whereNot: { id: userId }, // passé via ctx
}),
```

### Suppression — hard delete vs soft delete

Pour les users, on fait un **hard delete**. Le soft delete est réservé aux séances (Epic 5). Un user supprimé = supprimé. Le `CASCADE` sur `user_profiles` nettoie automatiquement.

### Confirmation de suppression côté frontend

Utiliser un composant Dialog de Shadcn/Radix ou `window.confirm()` en première approche. Le serveur vérifie de toute façon le self-delete.

### Fichiers à créer / modifier

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créer    | `app/validators/admin/update_user_validator.ts`  |
| Créer    | `app/validators/admin/reset_password_validator.ts` |
| Créer    | `app/use_cases/admin/update_user.ts`             |
| Créer    | `app/use_cases/admin/reset_user_password.ts`     |
| Créer    | `app/use_cases/admin/delete_user.ts`             |
| Créer    | `app/domain/errors/cannot_delete_self_error.ts`  |
| Créer    | `inertia/pages/Admin/Users/Edit.tsx`             |
| Modifier | `app/controllers/admin/users_controller.ts` (edit, update, resetPassword, destroy) |
| Modifier | `app/domain/interfaces/user_repository.ts` (findById, update, delete) |
| Modifier | `app/repositories/lucid_user_repository.ts` (implémenter) |
| Modifier | `inertia/pages/Admin/Users/Index.tsx` (liens cliquables) |
| Modifier | `start/routes.ts` (routes edit/update/delete/resetPassword) |
| Créer    | `tests/unit/use_cases/admin/update_user.spec.ts` |
| Créer    | `tests/unit/use_cases/admin/delete_user.spec.ts` |
| Créer    | `tests/functional/admin/manage_user.spec.ts`     |

### References

- [Source: _bmad-output/epics/epic-3-gestion-utilisateurs.md#Story 3.3]
- [Source: Story 3.1, 3.2 — pré-requis admin middleware + routes + controller]
