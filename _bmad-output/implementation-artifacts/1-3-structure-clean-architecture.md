# Story 1.3 : Structure Clean Architecture

Status: ready-for-dev

## Story

As a **dev (Luka)**,
I want **mettre en place la structure de dossiers Clean Architecture**,
so that **le code est organise des le depart avec des frontieres claires entre controllers, use cases, domain et repositories**.

## Acceptance Criteria

1. **Given** le projet est initialise et la qualite de code configuree **When** j'ouvre le projet dans mon editeur **Then** les dossiers suivants existent dans `app/` : `controllers/`, `domain/entities/`, `domain/value_objects/`, `domain/errors/`, `domain/interfaces/`, `use_cases/`, `repositories/`, `validators/`, `middleware/`
2. **Given** les dossiers sont crees **When** je lance `pnpm lint` et `tsc --noEmit` **Then** les deux passent sans erreur
3. **Given** les dossiers existent **When** je regarde chaque dossier **Then** chaque dossier contient un fichier `.gitkeep` ou un fichier d'exemple minimal

## Tasks / Subtasks

- [ ] Task 1 : Creer la structure backend Clean Architecture (AC: #1, #3)
  - [ ] Creer `app/domain/entities/` avec `.gitkeep`
  - [ ] Creer `app/domain/value_objects/` avec `.gitkeep`
  - [ ] Creer `app/domain/errors/` avec `.gitkeep`
  - [ ] Creer `app/domain/interfaces/` avec `.gitkeep`
  - [ ] Creer `app/use_cases/` avec `.gitkeep`
  - [ ] Creer `app/repositories/` avec `.gitkeep`
  - [ ] Verifier que `app/controllers/`, `app/validators/`, `app/middleware/` existent deja (fournis par le starter)
- [ ] Task 2 : Creer la structure frontend organisee par feature (AC: #1, #3)
  - [ ] Creer `inertia/components/ui/` avec `.gitkeep` (futur Shadcn/ui)
  - [ ] Creer `inertia/components/shared/` avec `.gitkeep`
  - [ ] Creer `inertia/layouts/` avec `.gitkeep`
  - [ ] Creer `inertia/hooks/` avec `.gitkeep`
  - [ ] Creer `inertia/lib/` avec `.gitkeep`
  - [ ] Verifier que `inertia/pages/` existe deja (fourni par le starter)
- [ ] Task 3 : Creer la structure de tests (AC: #1, #3)
  - [ ] Creer `tests/unit/use_cases/` avec `.gitkeep`
  - [ ] Creer `tests/unit/domain/` avec `.gitkeep`
  - [ ] Creer `tests/functional/` avec `.gitkeep`
- [ ] Task 4 : Validation (AC: #2)
  - [ ] Lancer `pnpm lint` → passe
  - [ ] Lancer `tsc --noEmit` → passe

## Dev Notes

### Architecture backend complete visee

```
app/
├── controllers/          # Adaptateurs HTTP — minces, zero logique metier
│   ├── auth/
│   ├── sessions/
│   ├── dashboard/
│   ├── profile/
│   └── admin/
├── domain/               # Coeur metier — AUCUNE dependance framework
│   ├── entities/         # User, Session, Sport
│   ├── value_objects/    # SportMetrics, PerceivedEffort, Pace
│   ├── errors/           # SessionNotFoundError, InvalidSportMetricsError...
│   └── interfaces/       # Contrats repositories (ports)
├── use_cases/            # 1 fichier = 1 intention metier
│   ├── auth/
│   ├── sessions/
│   ├── dashboard/
│   ├── profile/
│   └── admin/
├── repositories/         # Implementations Lucid (adaptateurs DB)
├── models/               # Modeles Lucid (ORM) — fourni par starter
├── middleware/            # Auth, admin guard — fourni par starter
└── validators/           # Schemas VineJS — fourni par starter
```

### Architecture frontend complete visee

```
inertia/
├── components/
│   ├── ui/               # Shadcn/ui (Button, Dialog, Sheet...)
│   └── shared/           # Composants metier (HeroMetric, SessionForm...)
├── pages/                # Pages Inertia (1 fichier = 1 route)
├── layouts/              # MainLayout, AuthLayout
├── hooks/                # Custom React hooks (use_unit_conversion...)
└── lib/                  # Utilitaires (formatters, sport_config)
```

### Regle de dependance Clean Architecture

```
Controllers → Use Cases → Domain ← Repositories (interfaces)
                                       ↑
                             Lucid Repositories (implementation)
```

- Le domain ne depend de RIEN (ni AdonisJS, ni Lucid, ni HTTP)
- Les use cases dependent du domain et des interfaces de repositories
- Les controllers dependent des use cases et des validators
- Les repositories Lucid implementent les interfaces du domain

### Conventions de nommage

| Element           | Convention               | Exemple              |
| ----------------- | ------------------------ | -------------------- |
| Fichiers backend  | snake_case.ts            | `log_session.ts`     |
| Fichiers React    | PascalCase.tsx           | `SessionForm.tsx`    |
| Dossiers backend  | snake_case               | `use_cases/`         |
| Dossiers frontend | kebab-case ou PascalCase | `components/shared/` |

### Anti-patterns interdits

- Controller qui accede directement a Lucid/DB (doit passer par un repository)
- Logique metier dans un composant React (doit vivre cote serveur dans un use case)
- Import circulaire entre domain et infrastructure
- Fichier fourre-tout `utils.ts` ou `helpers.ts`

### Ce qui NE doit PAS etre fait dans cette story

- Ne PAS creer de code metier — seulement la structure de dossiers
- Ne PAS creer de sous-dossiers par feature (auth/, sessions/) — ils seront crees quand les stories correspondantes seront implementees
- Les `.gitkeep` suffisent pour cette story

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
