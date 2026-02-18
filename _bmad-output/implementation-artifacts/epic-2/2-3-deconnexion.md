# Story 2.3 : Déconnexion

Status: done

## Story

As a **utilisateur connecté**,
I want **me déconnecter de mon compte**,
so that **ma session est fermée et mes données sont protégées** (FR5).

## Acceptance Criteria

1. **Given** je suis connecté **When** je clique sur "Se déconnecter" **Then** ma session est invalidée côté serveur **And** je suis redirigé vers la page de connexion
2. **Given** je suis déconnecté **When** j'utilise le bouton "retour" du navigateur **Then** je ne peux pas accéder aux pages protégées (la session est invalide côté serveur, pas seulement côté client)

## Tasks / Subtasks

- [x] Task 1 : Use Case LogoutUser (AC: #1, #2)
  - [x] Créer `app/use_cases/auth/logout_user.ts`
  - [x] Appeler `auth.use('web').logout()` pour invalider la session côté serveur
  - [x] Simple : pas de logique supplémentaire

- [x] Task 2 : Route + Controller (AC: #1, #2)
  - [x] Dans `start/routes.ts` : `POST /logout` (protégée, dans le groupe auth)
  - [x] Créer `app/controllers/auth/logout_controller.ts`
  - [x] Appeler `LogoutUser`, redirect vers `/login`
  - [x] **JAMAIS utiliser GET /logout** — vulnérabilité CSRF

- [x] Task 3 : Bouton déconnexion dans le layout (AC: #1)
  - [x] Dans `inertia/layouts/MainLayout.tsx` : ajouter un bouton/lien "Se déconnecter"
  - [x] Utiliser `useForm()` ou `router.post('/logout')` d'Inertia (POST, pas href)
  - [x] Emplacement : header (avatar menu dropdown) ou profil

- [x] Task 4 : Tests (AC: #1, #2)
  - [x] `tests/functional/auth/logout.spec.ts` : POST /logout → session invalidée → redirect /login, accès route protégée après logout → redirect /login

## Dev Notes

### Pourquoi POST et non GET

La déconnexion DOIT être un POST :
- Un GET `/logout` serait vulnérable au CSRF (un site malveillant pourrait intégrer `<img src="/logout">`)
- AdonisJS Shield bloque les GET sans token CSRF → le POST est protégé nativement

```typescript
// ✅ Correct — POST via Inertia
import { router } from '@inertiajs/react'
// Dans le composant :
<button onClick={() => router.post('/logout')}>Se déconnecter</button>

// ❌ Interdit — GET link
<a href="/logout">Se déconnecter</a>
```

### Invalidation côté serveur

`auth.use('web').logout()` supprime la session en base de données. Le cookie reste dans le navigateur mais pointe vers une session inexistante → le middleware auth redirige vers `/login`.

```typescript
// app/use_cases/auth/logout_user.ts
export default class LogoutUser {
  async execute(auth: HttpContext['auth']) {
    await auth.use('web').logout()
  }
}
```

### Controller mince

```typescript
// app/controllers/auth/logout_controller.ts
export default class LogoutController {
  async handle({ auth, response }: HttpContext) {
    await new LogoutUser().execute(auth)
    return response.redirect('/login')
  }
}
```

### Emplacement du bouton dans MainLayout

Selon l'UX spec, le header affiche le logo + avatar de l'utilisateur. Le bouton "Se déconnecter" peut vivre dans un dropdown déclenché par l'avatar (Shadcn DropdownMenu ou simple lien).

```tsx
// Exemple minimal dans MainLayout.tsx
<button
  onClick={() => router.post('/logout')}
  className="text-sm text-muted-foreground hover:text-foreground"
>
  Se déconnecter
</button>
```

### Fichiers à créer / modifier

| Action  | Fichier                                          |
|---------|--------------------------------------------------|
| Créer   | `app/use_cases/auth/logout_user.ts`              |
| Créer   | `app/controllers/auth/logout_controller.ts`      |
| Modifier| `start/routes.ts` (POST /logout dans groupe auth) |
| Modifier| `inertia/layouts/MainLayout.tsx` (bouton logout) |
| Créer   | `tests/functional/auth/logout.spec.ts`           |

### Conventions

- Route `POST /logout` — jamais `GET`
- Controller ultra-mince — juste appel use case + redirect
- Utiliser `router.post()` d'Inertia dans le composant React, pas un `<a href>`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — CSRF protection intégrée]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — MainLayout]
- [Source: _bmad-output/epics/epic-2-authentification.md#Story 2.3]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- LogoutController dédié créé (séparé du LoginController) — controller mince, appel use case + redirect
- MainLayout.tsx créé avec header (logo + bouton déconnexion) — `router.post('/logout')` d'Inertia
- home.tsx wrappé dans MainLayout, bouton inline retiré
- 3 tests fonctionnels dans `logout.spec.ts` couvrant AC#1 (session invalidée → redirect) et AC#2 (accès post-logout → redirect)
- Div décorative de home.tsx corrigée avec `pointer-events-none`

### File List

| Action   | Fichier                                            |
|----------|----------------------------------------------------|
| Créé     | `app/controllers/auth/logout_controller.ts`        |
| Créé     | `inertia/layouts/MainLayout.tsx`                   |
| Créé     | `tests/functional/auth/logout.spec.ts`             |
| Modifié  | `start/routes.ts`                                  |
| Modifié  | `app/controllers/auth/login_controller.ts`         |
| Modifié  | `inertia/pages/home.tsx`                           |
| Modifié  | `tests/functional/auth/login.spec.ts`              |
