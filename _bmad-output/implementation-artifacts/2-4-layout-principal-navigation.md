# Story 2.4 : Layout principal & navigation

Status: ready-for-dev

## Story

As a **utilisateur connecté**,
I want **voir l'app avec un header et une navigation claire**,
so that **je peux me repérer et naviguer entre les sections**.

## Acceptance Criteria

1. **Given** je suis connecté et sur n'importe quelle page **When** je regarde l'interface **Then** un header affiche le logo "Sporty" et mon avatar/initiale **And** sur mobile (< 768px) : une bottom tab bar affiche 4 onglets (Accueil, Séances, Planning, Profil) **And** sur desktop (>= 768px) : une sidebar de navigation remplace la bottom tab bar **And** les pages de login/register utilisent un AuthLayout séparé (centré, sans navigation)
2. **Given** je clique sur un onglet de navigation **When** la page se charge **Then** la navigation se fait en SPA sans rechargement complet (Inertia) **And** l'onglet actif est visuellement distingué

## Tasks / Subtasks

- [ ] Task 1 : AuthLayout (AC: #1)
  - [ ] Créer/compléter `inertia/layouts/AuthLayout.tsx`
  - [ ] Layout centré verticalement et horizontalement, fond neutre
  - [ ] Sans header, sans navigation — uniquement le contenu de la page
  - [ ] Utilisé par `Login.tsx` et `Register.tsx`

- [ ] Task 2 : MainLayout — Header (AC: #1, #2)
  - [ ] Créer/compléter `inertia/layouts/MainLayout.tsx`
  - [ ] Header fixe en haut : logo texte "Sporty" à gauche + Avatar (initiales utilisateur) à droite
  - [ ] Avatar : composant Shadcn `Avatar` avec `AvatarFallback` (initiale du `full_name`)
  - [ ] Le header reçoit `currentUser` via les shared props Inertia (`usePage().props.auth.user`)

- [ ] Task 3 : MainLayout — Bottom Tab Bar mobile (AC: #1, #2)
  - [ ] Bottom tab bar fixe (`position: fixed`, `bottom: 0`, `z-index: 50`)
  - [ ] 4 onglets : Accueil (`/`), Séances (`/sessions`), Planning (`/planning`), Profil (`/profile`)
  - [ ] Chaque onglet : icône + label court
  - [ ] Onglet actif : couleur `primary` (bleu), onglets inactifs : `muted-foreground`
  - [ ] Utiliser `usePage().url` d'Inertia pour détecter la route active
  - [ ] Icônes : Lucide React (`Home`, `Dumbbell` ou `Activity`, `Calendar`, `User`)
  - [ ] Visible uniquement sur mobile (`flex md:hidden`)

- [ ] Task 4 : MainLayout — Sidebar desktop (AC: #1, #2)
  - [ ] Sidebar gauche, largeur fixe (~240px), `hidden md:flex flex-col`
  - [ ] Mêmes 4 liens que la tab bar
  - [ ] Lien actif visuellement distingué (background primaire léger ou texte en `primary`)
  - [ ] Bouton "Se déconnecter" en bas de la sidebar

- [ ] Task 5 : Intégration Inertia layouts (AC: #1)
  - [ ] Chaque page protégée déclare `PageName.layout = (page) => <MainLayout>{page}</MainLayout>`
  - [ ] Pages Auth déclarent `PageName.layout = (page) => <AuthLayout>{page}</AuthLayout>`
  - [ ] S'assurer que `inertia/app/app.tsx` ne wrap pas toutes les pages dans un layout global conflictant

- [ ] Task 6 : Shared props Inertia (AC: #1)
  - [ ] Dans `start/kernel.ts` ou un middleware Inertia, partager `auth.user` en shared props
  - [ ] `router.on('before')` ou `sharedData` Inertia pour passer `currentUser` à toutes les pages

- [ ] Task 7 : Tests (AC: #1, #2)
  - [ ] Vérifier manuellement : mobile → tab bar visible, desktop (> 768px) → sidebar visible
  - [ ] `tests/functional/navigation.spec.ts` : navigation entre routes → pas de rechargement complet (header Inertia present `X-Inertia: true`)

## Dev Notes

### Inertia Layouts — Mécanisme

AdonisJS Inertia supporte les layouts "persistent" par page :

```tsx
// inertia/pages/Dashboard.tsx
import MainLayout from '~/layouts/MainLayout'

export default function Dashboard() {
  return <div>...</div>
}

Dashboard.layout = (page: React.ReactNode) => <MainLayout children={page} />
```

Ou via le composant `Layout` dans `app.tsx` :

```tsx
// inertia/app/app.tsx
// Vérifier si le starter kit configure déjà un layout global
// Si oui, s'assurer qu'il est compatible avec les layouts par page
```

### Shared Props — currentUser

```typescript
// start/kernel.ts ou middleware inertia
import { defineConfig } from '@adonisjs/inertia'
// Partager auth.user dans toutes les réponses Inertia
inertia.share(async (ctx) => ({
  auth: {
    user: ctx.auth.user
      ? { id: ctx.auth.user.id, fullName: ctx.auth.user.fullName, role: ctx.auth.user.role }
      : null,
  },
}))
```

Utilisation côté React :

```tsx
import { usePage } from '@inertiajs/react'
const { auth } = usePage<{ auth: { user: { fullName: string } | null } }>().props
```

### Détection de la route active (Inertia)

```tsx
import { usePage } from '@inertiajs/react'
const { url } = usePage()

const isActive = (path: string) => url === path || url.startsWith(path + '/')
```

### Structure MainLayout

```tsx
// inertia/layouts/MainLayout.tsx
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { auth } = usePage<SharedProps>().props

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b bg-background z-40 flex items-center justify-between px-4">
        <span className="font-semibold text-lg">Sporty</span>
        <Avatar>
          <AvatarFallback>{auth.user?.fullName?.charAt(0)?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-60 border-r flex-col p-4">
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>
        <LogoutButton />
      </aside>

      {/* Contenu principal */}
      <main className="pt-14 pb-16 md:pb-0 md:ml-60 p-4">
        {children}
      </main>

      {/* Bottom tab bar mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-background z-40 flex">
        {navItems.map((item) => <TabBarItem key={item.href} {...item} />)}
      </nav>
    </div>
  )
}
```

### Routes placeholder

Les routes `/sessions`, `/planning`, `/profile` n'existent pas encore. Créer des routes vides pour éviter les 404 lors de la navigation :

```typescript
// start/routes.ts — placeholders
router.group(() => {
  router.get('/', [DashboardController, 'index'])
  router.get('/sessions', ({ inertia }) => inertia.render('Sessions/Index'))  // placeholder
  router.get('/planning', ({ inertia }) => inertia.render('Planning/Index'))  // placeholder
  router.get('/profile', ({ inertia }) => inertia.render('Profile/Edit'))     // placeholder
}).use(middleware.auth())
```

### Icônes recommandées (Lucide React — déjà installé via Shadcn)

| Onglet   | Icône Lucide    |
|----------|-----------------|
| Accueil  | `Home`          |
| Séances  | `Activity`      |
| Planning | `Calendar`      |
| Profil   | `User`          |

### Tokens de design à utiliser

Tailwind tokens définis en Story 1.4 :
- `primary` → bleu accent (onglet actif)
- `muted-foreground` → gris (onglets inactifs)
- `background` → blanc/gris très clair
- `border` → gris très clair (séparateur header/tab bar)

### Fichiers à créer / modifier

| Action  | Fichier                                               |
|---------|-------------------------------------------------------|
| Créer   | `inertia/layouts/AuthLayout.tsx`                      |
| Créer   | `inertia/layouts/MainLayout.tsx`                      |
| Modifier| `inertia/pages/Auth/Login.tsx` (ajouter layout)       |
| Modifier| `inertia/pages/Auth/Register.tsx` (ajouter layout)    |
| Modifier| `start/routes.ts` (routes placeholder sessions, etc.) |
| Modifier| `start/kernel.ts` ou middleware Inertia (shared props) |
| Créer   | `tests/functional/navigation.spec.ts` (optionnel)     |

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision — Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — Design System Components]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Spacing & Layout Foundation]
- [Source: _bmad-output/epics/epic-2-authentification.md#Story 2.4]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List
