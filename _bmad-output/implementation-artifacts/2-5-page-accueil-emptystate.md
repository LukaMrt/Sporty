# Story 2.5 : Page d'accueil (EmptyState)

Status: ready-for-dev

## Story

As a **utilisateur connecté sans données**,
I want **voir un écran d'accueil accueillant qui m'invite à commencer**,
so that **je comprends immédiatement quoi faire ensuite**.

## Acceptance Criteria

1. **Given** je suis connecté et je n'ai aucune séance enregistrée **When** j'arrive sur la page d'accueil `/` **Then** un EmptyState s'affiche avec une illustration/icône, un message accueillant ("Saisis ta première séance pour commencer") et un bouton CTA **And** le ton est bienveillant, sans pression
2. **Given** je clique sur le bouton CTA **When** l'action se déclenche **Then** rien ne se passe encore — le bouton est présent mais désactivé ou affiche un placeholder (le formulaire sera implémenté en Epic 4)

## Tasks / Subtasks

- [ ] Task 1 : Route dashboard (AC: #1)
  - [ ] Dans `start/routes.ts` : `GET /` (protégée) → `[DashboardController, 'index']`
  - [ ] Créer `app/controllers/dashboard/dashboard_controller.ts`
  - [ ] Le controller passe les props `{ sessionCount: 0 }` (ou query DB réelle) → `inertia.render('Dashboard', props)`

- [ ] Task 2 : Composant EmptyState (AC: #1, #2)
  - [ ] Créer `inertia/components/shared/EmptyState.tsx`
  - [ ] Props : `title: string`, `description?: string`, `ctaLabel?: string`, `onCta?: () => void`
  - [ ] Rendu : icône/illustration centrée + titre + description + bouton CTA (disabled si pas de `onCta`)
  - [ ] Icône suggérée : Lucide `Dumbbell` ou `Activity` (grande, `size={48}`, couleur `muted-foreground`)
  - [ ] Ton du message : "Saisis ta première séance pour commencer" — accueillant, pas de pression

- [ ] Task 3 : Page Dashboard (AC: #1, #2)
  - [ ] Créer `inertia/pages/Dashboard.tsx` wrappée dans `MainLayout`
  - [ ] Si `sessionCount === 0` → afficher `<EmptyState />`
  - [ ] Si `sessionCount > 0` → afficher un placeholder minimal ("Tableau de bord — à venir") pour les Epics suivants
  - [ ] Bouton CTA de l'EmptyState : `disabled` ou `onClick={() => {}}` (non fonctionnel en Epic 2)

- [ ] Task 4 : Tests (AC: #1, #2)
  - [ ] `tests/functional/dashboard.spec.ts` : GET / sans session → redirect /login, GET / connecté sans séances → page Dashboard rendue avec EmptyState

## Dev Notes

### Comportement du bouton CTA

**Critique :** Le bouton CTA doit exister visuellement mais ne rien faire en Epic 2. En Epic 4, il déclenchera le bottom sheet de saisie.

```tsx
// inertia/components/shared/EmptyState.tsx
<Button disabled className="mt-4">
  Saisir ma première séance
</Button>
```

Ou avec un `onClick` no-op pour le moment :

```tsx
<Button onClick={() => {}} className="mt-4">
  Saisir ma première séance
</Button>
```

**Ne pas implémenter le bottom sheet / formulaire** — c'est l'Epic 4.

### Structure du composant EmptyState

```tsx
// inertia/components/shared/EmptyState.tsx
import { Activity } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  ctaLabel?: string
}

export default function EmptyState({ title, description, ctaLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <Activity size={48} className="text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {ctaLabel && (
        <Button disabled className="mt-4">
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
```

### Page Dashboard

```tsx
// inertia/pages/Dashboard.tsx
import MainLayout from '~/layouts/MainLayout'
import EmptyState from '~/components/shared/EmptyState'

interface DashboardProps {
  sessionCount: number
}

export default function Dashboard({ sessionCount }: DashboardProps) {
  return (
    <>
      {sessionCount === 0 ? (
        <EmptyState
          title="Saisis ta première séance pour commencer"
          description="Suis tes entraînements et vois ta progression au fil du temps."
          ctaLabel="Saisir ma première séance"
        />
      ) : (
        <p className="text-muted-foreground">Tableau de bord — à venir</p>
      )}
    </>
  )
}

Dashboard.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
```

### Controller mince

```typescript
// app/controllers/dashboard/dashboard_controller.ts
export default class DashboardController {
  async index({ inertia, auth }: HttpContext) {
    // En Epic 2, on passe simplement sessionCount = 0
    // En Epic 4+, on requêtera les vraies données
    return inertia.render('Dashboard', { sessionCount: 0 })
  }
}
```

### Ton bienveillant — principes UX

Selon l'UX spec :
- Pas de pression ("Tu n'as pas encore de données" → **non**)
- Message accueillant et encourageant sans culpabilité
- "L'échec n'existe pas" — zéro compteur manqué, zéro badge rouge

```
✅ "Saisis ta première séance pour commencer"
✅ "Suis tes entraînements et vois ta progression au fil du temps"
❌ "Aucune séance trouvée"
❌ "Tu n'as pas encore commencé"
```

### Route `/` dans start/routes.ts

```typescript
// start/routes.ts
router.group(() => {
  router.get('/', [DashboardController, 'index'])
  // ... autres routes
}).use(middleware.auth())
```

### Fichiers à créer / modifier

| Action  | Fichier                                              |
|---------|------------------------------------------------------|
| Créer   | `app/controllers/dashboard/dashboard_controller.ts`  |
| Créer   | `inertia/pages/Dashboard.tsx`                        |
| Créer   | `inertia/components/shared/EmptyState.tsx`           |
| Modifier| `start/routes.ts` (GET / → DashboardController)      |
| Créer   | `tests/functional/dashboard.spec.ts`                 |

### Composants Shadcn requis

- `Button` (déjà installé depuis Story 1.4)
- Icônes Lucide React (déjà disponibles via Shadcn)

### Evolution future (Epic 4+)

Quand le formulaire de saisie sera implémenté (Epic 4), le bouton CTA déclenchera un bottom sheet. L'interface sera enrichie en Epic 5 et 6 avec les vraies données de dashboard.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — EmptyState]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Design Principles — L'échec n'existe pas]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow 3 : Consultation dashboard]
- [Source: _bmad-output/epics/epic-2-authentification.md#Story 2.5]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List
