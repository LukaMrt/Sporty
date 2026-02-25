# Story 4.1 : Saisie d'une séance

Status: done

## Story

As a **utilisateur connecté**,
I want **saisir une séance d'entraînement rapidement**,
so that **mes données sont enregistrées et je construis mon historique** (FR10, FR11, FR22, FR23).

## Acceptance Criteria

1. **Given** je suis sur n'importe quelle page **When** je tape sur le FAB "+" (mobile) ou le bouton "Nouvelle séance" (desktop) **Then** un bottom sheet (mobile) ou une modale (desktop) s'ouvre avec le formulaire de saisie
2. **Given** le formulaire est ouvert **When** je regarde les champs visibles **Then** je vois : Sport (dropdown, pré-rempli avec le dernier sport utilisé), Date (pré-remplie à aujourd'hui), Durée (hh:mm), Distance (km) **And** une section "Plus de détails" est repliée en dessous
3. **Given** je déplie "Plus de détails" **When** je regarde les champs secondaires **Then** je vois : FC moyenne (bpm), Allure (auto-calculée si durée + distance renseignés), Ressenti (emoji picker 1-5), Notes libres **And** les métriques affichées sont spécifiques au sport sélectionné (FR23)
4. **Given** je remplis au minimum sport_type + durée et je clique "Enregistrer" **When** la requête est traitée **Then** la séance est sauvegardée en base avec les données socle commun + sport_metrics (JSONB) **And** le bottom sheet/modale se ferme **And** un toast confirme "Séance ajoutée"
5. **Given** je swipe down (mobile) ou clique hors zone sans avoir rempli de champs **When** le bottom sheet se ferme **Then** aucune donnée n'est perdue
6. **Given** j'ai commencé à remplir des champs et je tente de fermer **When** je swipe down ou clique hors zone **Then** une confirmation s'affiche "Abandonner la saisie ?"
7. **Given** la page d'accueil affiche l'EmptyState (story 2.5) **When** je clique sur le CTA **Then** le formulaire de saisie s'ouvre (le bouton CTA désactivé est remplacé par un vrai lien vers le formulaire)

## Tasks / Subtasks

- [ ] Task 0 : Migration — ajout colonne `notes` (AC: #3, #4)
  - [ ] Créer `database/migrations/TIMESTAMP_add_notes_to_sessions.ts`
  - [ ] `table.text('notes').nullable()` dans `up()`, `table.dropColumn('notes')` dans `down()`
  - [ ] Relancer `node ace migration:run` (et `NODE_ENV=test node ace migration:run` pour les tests)

- [ ] Task 1 : Domain — entité TrainingSession + port SessionRepository (AC: #4)
  - [ ] Créer `app/domain/entities/training_session.ts` — interface `TrainingSession { id, userId, sportType, date, durationMinutes, distanceKm, avgHeartRate, perceivedEffort, sportMetrics, notes, createdAt }`
  - [ ] Créer `app/domain/interfaces/session_repository.ts` — abstract class `SessionRepository` avec `create(data): Promise<TrainingSession>`, `findAllByUserId(userId, opts?): Promise<TrainingSession[]>`, `findById(id): Promise<TrainingSession | null>`, `update(id, data): Promise<TrainingSession>`, `softDelete(id): Promise<void>`, `restore(id): Promise<void>`
  - [ ] Créer `app/domain/errors/session_not_found_error.ts`
  - [ ] Créer `app/domain/errors/session_forbidden_error.ts` (accès à une séance d'un autre user)

- [ ] Task 2 : Repository — LucidSessionRepository (AC: #4)
  - [ ] Créer `app/repositories/lucid_session_repository.ts` — extends `SessionRepository`
  - [ ] Méthode privée `#toEntity(model: SessionModel): TrainingSession` pour mapper Lucid → domain
  - [ ] `create()` : insère en DB, retourne l'entité
  - [ ] `findAllByUserId()` : `.withScopes((s) => s.withoutTrashed()).where('userId', userId).orderBy('date', 'desc')`
  - [ ] `findById()` : `.withScopes((s) => s.withoutTrashed()).where('id', id).first()` → retourne null si absent
  - [ ] Enregistrer le binding dans `providers/app_provider.ts` : `this.app.container.bind(SessionRepository, ...)`

- [ ] Task 3 : Use Case — CreateSession (AC: #4)
  - [ ] Créer `app/use_cases/sessions/create_session.ts`
  - [ ] `@inject()`, reçoit `SessionRepository` dans le constructeur
  - [ ] `execute(userId, input)` : crée la séance avec `userId` injecté côté serveur (jamais depuis le formulaire)
  - [ ] Input type : `{ sportType, date, durationMinutes, distanceKm?, avgHeartRate?, perceivedEffort?, sportMetrics?, notes? }`

- [ ] Task 4 : Validator (AC: #4)
  - [ ] Créer `app/validators/sessions/create_session_validator.ts`
  - [ ] Champs : `sport_type` (string, required, trim), `date` (date, required), `duration_minutes` (number, required, min 1, max 1440), `distance_km` (number, optional, nullable, min 0), `avg_heart_rate` (number, optional, nullable, min 30, max 250), `perceived_effort` (number, optional, nullable, min 1, max 5), `sport_metrics` (object, optional), `notes` (string, optional, nullable, maxLength 1000)

- [ ] Task 5 : Route + Controller (AC: #4, #7)
  - [ ] Créer `app/controllers/sessions/sessions_controller.ts` — `@inject()`, reçoit `CreateSession` + `ListSessions` + `GetSession` + `UpdateSession` + `DeleteSession` (prévoir les 5 dans le constructeur, implémenter `store` maintenant)
  - [ ] Route : remplacer `router.on('/sessions').renderInertia(...)` par des vraies routes dans le groupe auth+onboarding
  - [ ] `GET /sessions` → `SessionsController.index` (render `Sessions/Index`)
  - [ ] `POST /sessions` → `SessionsController.store` (validate → use case → flash 'Séance ajoutée' → redirect `/sessions`)
  - [ ] Import lazy : `const SessionsController = () => import('#controllers/sessions/sessions_controller')`

- [ ] Task 6 : Installer les composants Shadcn manquants (AC: #1, #2, #3)
  - [ ] Installer `dialog` (modale desktop), `sheet` (bottom sheet mobile), `select` (dropdown sport), `textarea` (notes), `card` (si nécessaire), `label`
  - [ ] Commande : `pnpm dlx shadcn@latest add dialog sheet select textarea card label`

- [ ] Task 7 : Composant FAB (AC: #1)
  - [ ] Créer `inertia/components/shared/FAB.tsx`
  - [ ] Bouton rond fixe `fixed bottom-20 right-4 md:hidden` (au-dessus du tab bar = h-16, donc bottom-20 = 5rem)
  - [ ] Icône `+`, taille tactile ≥ 44×44px, couleur primary
  - [ ] Prop `onClick: () => void`

- [ ] Task 8 : Composant SessionForm (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Créer `inertia/components/sessions/SessionForm.tsx`
  - [ ] Utilise `useForm` d'Inertia pour gérer le state et le submit
  - [ ] Champs principaux visibles : Sport (Select, pré-rempli), Date (input date, default today), Durée (input number hh:mm ou minutes), Distance (input number km)
  - [ ] Section "Plus de détails" repliable (collapsible) : FC moyenne, Ressenti (emoji 1-5), Notes (textarea)
  - [ ] Allure auto-calculée si durée + distance renseignés (affichage seulement, pas envoyée au serveur)
  - [ ] Props : `sports: { id, name, slug }[]`, `defaultSportType?: string`, `onClose: () => void`, `mode: 'create' | 'edit'`, `session?: TrainingSession` (pour pré-remplissage en mode edit, story 4.4)
  - [ ] Submit : `form.post('/sessions')` en mode create

- [ ] Task 9 : Page Sessions/Index avec modale/sheet (AC: #1, #7)
  - [ ] Réécrire `inertia/pages/Sessions/Index.tsx` — remplacer le stub actuel
  - [ ] Si aucune séance : EmptyState avec CTA qui ouvre le formulaire (modifier `EmptyState` pour accepter `onCtaClick?: () => void`)
  - [ ] State local `isFormOpen` pour contrôler l'ouverture du formulaire
  - [ ] Desktop : `<Dialog>` pour le formulaire
  - [ ] Mobile : `<Sheet>` pour le formulaire (bottom sheet)
  - [ ] Intégrer le FAB "+" en mobile
  - [ ] Desktop : bouton "Nouvelle séance" visible dans le header de la liste
  - [ ] Passer les `sports` et `sessions` comme props Inertia depuis le controller

- [ ] Task 10 : Modifier EmptyState (AC: #7)
  - [ ] Ajouter prop `onCtaClick?: () => void` à `inertia/components/shared/EmptyState.tsx`
  - [ ] Si `onCtaClick` fourni : le bouton est actif et appelle `onCtaClick`
  - [ ] Si absent : comportement actuel (bouton désactivé)
  - [ ] Mettre à jour le Dashboard pour passer `onCtaClick` qui navigue vers `/sessions`

- [ ] Task 11 : Tests unitaires (AC: #4)
  - [ ] Créer `tests/unit/use_cases/sessions/create_session.spec.ts`
  - [ ] Créer `tests/helpers/mock_session_repository.ts` (pattern identique à `mock_user_repository.ts`)
  - [ ] Tests : création réussie, userId bien injecté côté serveur

- [ ] Task 12 : Tests fonctionnels (AC: #1, #4, #5)
  - [ ] Créer `tests/functional/sessions/create_session.spec.ts`
  - [ ] `POST /sessions` valide → 302 redirect + séance en DB + flash success
  - [ ] `POST /sessions` données invalides → redirect back + errors
  - [ ] `POST /sessions` non connecté → redirect `/login`
  - [ ] `GET /sessions` connecté → 200
  - [ ] `GET /sessions` non connecté → redirect `/login`

## Dev Notes

### Architecture & Patterns

**Clean Architecture — flux de données pour la saisie :**
```
Browser → POST /sessions
  → SessionsController.store
    → createSessionValidator (VineJS)
      → CreateSession use case
        → SessionRepository.create (port)
          → LucidSessionRepository (adaptor) → DB INSERT
      ← TrainingSession entity
    ← session.flash('success') + redirect('/sessions')
```

**Conventions à respecter absolument :**
- Controllers minces : valider → use case → flash → redirect. Zéro logique métier
- Ports = abstract classes (jamais `interface`) dans `app/domain/interfaces/`
- `@inject()` sur controller ET use case
- Binding IoC dans `providers/app_provider.ts`
- Nommage snake_case pour tous les fichiers backend, PascalCase pour React
- Props Inertia en camelCase, colonnes DB en snake_case

### Modèle de données Sessions (migration existante)

```
sessions:
  id              INTEGER PK AUTO
  user_id         INTEGER FK→users.id NOT NULL, indexed
  sport_type      STRING NOT NULL, indexed
  date            DATE NOT NULL
  duration_minutes INTEGER NOT NULL
  distance_km     DECIMAL(8,2) NULLABLE
  avg_heart_rate  INTEGER NULLABLE
  perceived_effort INTEGER NULLABLE
  sport_metrics   JSONB NOT NULL DEFAULT '{}'
  notes           TEXT NULLABLE
  deleted_at      TIMESTAMP NULLABLE, indexed
  created_at      TIMESTAMP NOT NULL
  updated_at      TIMESTAMP NULLABLE
```

La colonne `notes` est ajoutée via la migration de Task 0 (elle n'existe pas dans la migration initiale).

Le modèle Lucid `Session` existe déjà avec les scopes `withoutTrashed` et `onlyTrashed`.

### Modèle Lucid Session existant

Le modèle est déjà dans `app/models/session.ts` avec :
- Tous les `@column()` déclarés
- `@belongsTo(() => User)` relation
- `withoutTrashed` et `onlyTrashed` comme scopes statiques

**IMPORTANT :** `@column.date()` retourne un `DateTime` Luxon. Utiliser `.toISODate()` lors du mapping vers l'entité domain.

### Sport pré-rempli

Le sport "Course à pied" (slug: `running`) est seedé. Pour pré-remplir le dropdown, passer le dernier `sportType` utilisé (depuis la dernière séance) ou fallback sur le sport du profil utilisateur.

### Bottom Sheet vs Modale

- Mobile (< 768px) : utiliser `<Sheet>` de Shadcn (slide depuis le bas)
- Desktop (≥ 768px) : utiliser `<Dialog>` de Shadcn (modale centrée)
- Détecter le breakpoint via un hook custom `useIsMobile()` ou simplement avec le CSS et rendre les deux composants (un caché sur mobile, l'autre sur desktop)

### EmptyState — breaking change minimal

Le composant `EmptyState` actuel a un CTA désactivé. Ajouter `onCtaClick?: () => void` — si fourni le bouton devient actif. Backward-compatible.

### Confirmation d'abandon

Quand le formulaire a des champs modifiés (`form.isDirty` d'Inertia) et que l'utilisateur tente de fermer :
- Afficher un `<Dialog>` de confirmation "Abandonner la saisie ?"
- Si confirmé : fermer sans sauvegarder
- Si annulé : rester sur le formulaire

### Allure auto-calculée

```typescript
// Affichage seulement, pas stockée en base
const pace = durationMinutes && distanceKm
  ? `${Math.floor(durationMinutes / distanceKm)}'${Math.round((durationMinutes / distanceKm % 1) * 60).toString().padStart(2, '0')}/km`
  : null
```

### Notes campo `notes`

Le champ `notes` est une colonne SQL dédiée (`TEXT NULLABLE`), ajoutée via la migration de Task 0. **Ne pas stocker dans `sport_metrics`** — `sport_metrics` JSONB est réservé aux métriques spécifiques au sport (ex: `elevation_gain`, `avg_cadence`, `avg_power`). Mélanger du texte libre dans ce champ serait une dette technique : perte de queryabilité SQL, couplage de deux préoccupations distinctes.

### Fichiers à créer / modifier

| Action   | Fichier                                                  |
|----------|----------------------------------------------------------|
| Créer    | `database/migrations/TIMESTAMP_add_notes_to_sessions.ts` |
| Créer    | `app/domain/entities/training_session.ts`                |
| Créer    | `app/domain/interfaces/session_repository.ts`            |
| Créer    | `app/domain/errors/session_not_found_error.ts`           |
| Créer    | `app/domain/errors/session_forbidden_error.ts`           |
| Créer    | `app/repositories/lucid_session_repository.ts`           |
| Créer    | `app/use_cases/sessions/create_session.ts`               |
| Créer    | `app/validators/sessions/create_session_validator.ts`    |
| Créer    | `app/controllers/sessions/sessions_controller.ts`        |
| Créer    | `inertia/components/shared/FAB.tsx`                      |
| Créer    | `inertia/components/sessions/SessionForm.tsx`            |
| Modifier | `inertia/pages/Sessions/Index.tsx` (remplacer stub)      |
| Modifier | `inertia/components/shared/EmptyState.tsx` (ajout prop)  |
| Modifier | `inertia/pages/Dashboard.tsx` (CTA EmptyState → /sessions) |
| Modifier | `providers/app_provider.ts` (binding SessionRepository)  |
| Modifier | `start/routes.ts` (routes sessions)                      |
| Installer| `shadcn: dialog, sheet, select, textarea, card, label`   |
| Créer    | `tests/helpers/mock_session_repository.ts`               |
| Créer    | `tests/unit/use_cases/sessions/create_session.spec.ts`   |
| Créer    | `tests/functional/sessions/create_session.spec.ts`       |

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — sessions table]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#SessionForm, FAB, Bottom Sheet]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]
- [Source: app/models/session.ts — modèle Lucid existant]
- [Source: app/domain/interfaces/user_repository.ts — pattern port abstract class]
- [Source: app/repositories/lucid_user_repository.ts — pattern repository]
- [Source: providers/app_provider.ts — pattern IoC binding]
- [Source: Story 3.6 — pattern controller @inject + use case + inertia.render]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
