# Story 1.4 : Configuration Tailwind CSS + Shadcn/ui

Status: ready-for-dev

## Story

As a **dev (Luka)**,
I want **configurer Tailwind CSS et initialiser Shadcn/ui**,
so that **le design system est pret a etre utilise avec les tokens de design (couleurs, typo, espacements)**.

## Acceptance Criteria

1. **Given** le projet est initialise **When** j'ouvre la page d'accueil dans le navigateur **Then** Tailwind CSS est actif (les classes utilitaires fonctionnent)
2. **Given** Tailwind est configure **When** je regarde `tailwind.config.ts` **Then** les tokens de design Sporty sont configures (palette bleu accent, gris, espacements 4px)
3. **Given** Shadcn/ui est initialise **When** j'importe un composant Button **Then** le composant est disponible et s'affiche correctement
4. **Given** la config est complete **When** je regarde la page **Then** la police system native est definie comme font par defaut

## Tasks / Subtasks

- [ ] Task 1 : Installer et configurer Tailwind CSS (AC: #1, #2, #4)
  - [ ] Installer Tailwind CSS, PostCSS et autoprefixer : `pnpm add -D tailwindcss postcss autoprefixer`
  - [ ] Initialiser : `npx tailwindcss init -p --ts`
  - [ ] Configurer les `content` paths dans `tailwind.config.ts` pour couvrir `inertia/**/*.{ts,tsx}`
  - [ ] Ajouter les directives Tailwind (`@tailwind base; @tailwind components; @tailwind utilities;`) dans le fichier CSS principal
  - [ ] Configurer les tokens de design dans `tailwind.config.ts` (voir section tokens ci-dessous)
  - [ ] Definir la police system native comme font par defaut
- [ ] Task 2 : Initialiser Shadcn/ui (AC: #3)
  - [ ] Installer Shadcn/ui : `npx shadcn@latest init`
  - [ ] Configurer `components.json` pour pointer vers `inertia/components/ui/`
  - [ ] Installer le composant Button : `npx shadcn@latest add button`
  - [ ] Verifier que le Button est importable depuis `inertia/components/ui/Button`
- [ ] Task 3 : Validation visuelle (AC: #1, #3, #4)
  - [ ] Ajouter un bouton de test avec `<Button className="bg-primary text-white p-4">Test</Button>` dans une page
  - [ ] Verifier qu'il s'affiche bleu avec du padding
  - [ ] Verifier que la police system native est appliquee
  - [ ] Lancer `pnpm lint` et `tsc --noEmit` → passent

## Dev Notes

### Tokens de design Sporty

Extrait du UX Design Specification :

**Palette couleur :**

| Role | Token Tailwind | Valeur approximative |
|------|---------------|---------------------|
| Background | `bg-background` | Blanc pur / Gris tres clair |
| Surface | `bg-surface` | Blanc |
| Text Primary | `text-foreground` | Gris tres fonce (quasi-noir) |
| Text Secondary | `text-muted-foreground` | Gris moyen |
| Primary / Accent | `bg-primary` | Bleu (l'accent unique de Sporty) |
| Primary Light | `bg-primary/10` | Bleu clair / pastel |
| Success | `text-success` | Vert doux |
| Warning | `text-warning` | Orange doux |
| Border | `border-border` | Gris tres clair |

**Principes couleur critiques :**
- Pas de rouge pour les "echecs" → gris neutre ou orange doux
- Le bleu est la seule couleur forte de l'interface
- Contraste minimum 4.5:1 pour le texte (WCAG AA)

**Espacements (unite de base 4px) :**

| Token | Valeur |
|-------|--------|
| xs | 4px (1) |
| sm | 8px (2) |
| md | 16px (4) |
| lg | 24px (6) |
| xl | 32px (8) |
| 2xl | 48px (12) |

**Police :**
```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

**Echelle typographique :**

| Niveau | Mobile | Desktop |
|--------|--------|---------|
| Display | 32-36px | 40-48px |
| H1 | 24px | 28-32px |
| H2 | 20px | 22-24px |
| Body | 14-16px | 16px |
| Caption | 12px | 13px |

### Configuration Shadcn/ui

Shadcn/ui copie les composants directement dans le projet (`inertia/components/ui/`). Ce ne sont PAS des imports de package — les fichiers sont owned par le projet et customisables.

Le `components.json` doit pointer vers :
- `aliases.components`: `inertia/components`
- `aliases.ui`: `inertia/components/ui`
- `aliases.utils`: `inertia/lib/utils`

### Compatibilite Vite

Le starter AdonisJS utilise Vite. Tailwind CSS et Shadcn/ui sont compatibles nativement avec Vite. Verifier que le `vite.config.ts` inclut PostCSS dans sa config.

### Dark mode ready

L'architecture des tokens doit supporter un theme sombre (implem post-MVP). Utiliser les CSS variables de Shadcn/ui qui le supportent nativement.

### Anti-patterns a eviter

- Ne PAS ecrire du CSS custom — utiliser les classes Tailwind
- Ne PAS modifier les composants Shadcn/ui dans cette story — juste installer le Button pour valider
- Ne PAS ajouter d'autres composants Shadcn/ui au-dela du Button — ils seront ajoutes au besoin dans les stories suivantes

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Design System]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Typography System]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Spacing & Layout Foundation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
