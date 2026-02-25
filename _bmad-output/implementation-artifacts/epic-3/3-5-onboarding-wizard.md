# Story 3.5 : Onboarding wizard (premier login)

Status: review

## Story

As a **nouvel utilisateur (premier login)**,
I want **être guidé pour configurer mon profil sportif et mes préférences**,
so that **l'app est personnalisée dès le départ sans friction** (FR7, FR8).

## Acceptance Criteria

1. **Given** je me connecte pour la première fois (`onboarding_completed = false`) **When** j'arrive dans l'app **Then** je suis redirigé vers le wizard d'onboarding en 4 étapes
2. **Given** je suis sur l'étape 1 (Sport) **When** je sélectionne un sport via une grille d'icônes **Then** mon choix est retenu et je passe à l'étape suivante
3. **Given** je suis sur l'étape 2 (Niveau) **When** je choisis entre Débutant / Intermédiaire / Confirmé (3 cartes) **Then** mon niveau est retenu
4. **Given** je suis sur l'étape 3 (Objectif) **When** je choisis un objectif ou je skip ("Pas d'objectif précis") **Then** mon objectif est retenu (ou vide si skip)
5. **Given** je suis sur l'étape 4 (Préférences) **When** je choisis mes unités d'affichage (km/h ou min/km) **Then** mes préférences sont retenues
6. **Given** je termine l'étape 4 **When** je clique "Terminer" **Then** un `user_profile` est créé en DB avec toutes mes réponses **And** `onboarding_completed` passe à `true` **And** je suis redirigé vers la page d'accueil
7. **Given** une barre de progression (4 dots) est visible en haut à chaque étape **And** je peux revenir en arrière à tout moment
8. **Given** je me reconnecte après avoir terminé l'onboarding **When** j'arrive dans l'app **Then** le wizard ne se relance pas (je vais directement à l'accueil)

## Tasks / Subtasks

- [x] Task 1 : Domain — entité UserProfile complète + port UserProfileRepository (AC: #6)
  - [x] Finaliser `app/domain/entities/user_profile.ts` si pas déjà complet
  - [x] Créer `app/domain/interfaces/user_profile_repository.ts` (classe abstraite) avec `create(profile): Promise<UserProfile>`
  - [x] Ajouter `markOnboardingCompleted(userId: number): Promise<void>` au port `UserRepository`

- [x] Task 2 : Repository UserProfile (AC: #6)
  - [x] Créer modèle Lucid `app/models/user_profile.ts` avec relation `belongsTo(User)`
  - [x] Ajouter relation `hasOne(UserProfile)` dans le modèle `User`
  - [x] Créer `app/repositories/lucid_user_profile_repository.ts` extends `UserProfileRepository`
  - [x] Implémenter `create()` — crée une entrée `user_profiles`
  - [x] Implémenter `markOnboardingCompleted()` dans `LucidUserRepository` — `UPDATE users SET onboarding_completed = true`
  - [x] Binding IoC dans `AppProvider`

- [x] Task 3 : Use Case `CompleteOnboarding` (AC: #6)
  - [x] Créer `app/use_cases/onboarding/complete_onboarding.ts`
  - [x] Injecter `UserProfileRepository` + `UserRepository`
  - [x] Créer le `user_profile` avec les données du wizard
  - [x] Appeler `markOnboardingCompleted(userId)`
  - [x] Tout dans une transaction si possible

- [x] Task 4 : Middleware onboarding (AC: #1, #8)
  - [x] Créer `app/middleware/onboarding_middleware.ts`
  - [x] Si `auth.user.onboardingCompleted === false` ET la route n'est pas `/onboarding/*` ni `/logout` → redirect `/onboarding`
  - [x] Enregistrer dans `start/kernel.ts`
  - [x] Appliquer après le middleware auth sur les routes protégées

- [x] Task 5 : Routes + Controller (AC: #1, #2-#6)
  - [x] Ajouter routes (protégées par auth, PAS par onboarding middleware) :
    - `GET /onboarding` → `OnboardingController.show`
    - `POST /onboarding` → `OnboardingController.complete`
  - [x] `show` : charger la liste des sports depuis la DB, render `Onboarding/Wizard`
  - [x] `complete` : valider → use case → redirect `/`
  - [x] Passer les sports comme prop : `{ sports: [{ id, name, slug }] }`

- [x] Task 6 : Validator (AC: #2-#5)
  - [x] Créer `app/validators/onboarding/complete_onboarding_validator.ts`
  - [x] Champs : `sport_id` (number, exists in sports), `level` (enum: beginner/intermediate/advanced), `objective` (string, optional), `preferred_unit` (enum: km_h/min_km)

- [x] Task 7 : Page React Onboarding/Wizard (AC: #2-#5, #7)
  - [x] Créer `inertia/pages/Onboarding/Wizard.tsx`
  - [x] State local pour l'étape courante (1 à 4) et les réponses
  - [x] **Étape 1 — Sport :** Grille d'icônes cliquables générée depuis la prop `sports`. Chaque sport = une carte avec icône + nom
  - [x] **Étape 2 — Niveau :** 3 cartes : "Je débute" (beginner) / "Je cours régulièrement" (intermediate) / "Je m'entraîne sérieusement" (advanced)
  - [x] **Étape 3 — Objectif :** Choix d'objectifs prédéfinis + option "Pas d'objectif précis" (skip). Exemples : "Progresser en endurance", "Courir plus vite", "Reprendre après une pause"
  - [x] **Étape 4 — Préférences :** Toggle/radio entre km/h et min/km, avec valeur par défaut min/km
  - [x] **Barre de progression :** 4 dots en haut, dot actif mis en surbrillance
  - [x] **Navigation :** Bouton "Suivant" + bouton "Retour" (sauf étape 1). "Terminer" sur l'étape 4
  - [x] Au clic "Terminer" → `useForm().post('/onboarding')` avec toutes les données
  - [x] Layout dédié (pas `MainLayout` — le wizard est plein écran, sobre)

- [x] Task 8 : Tests (AC: #1, #6, #8)
  - [x] `tests/unit/use_cases/onboarding/complete_onboarding.spec.ts` : crée le profil + marque onboarding completed
  - [x] `tests/functional/onboarding/wizard.spec.ts` :
    - User avec `onboarding_completed = false` → toute route protégée redirige vers `/onboarding`
    - GET `/onboarding` → 200 + liste des sports
    - POST `/onboarding` valide → profil créé en DB + `onboarding_completed = true` + redirect `/`
    - POST `/onboarding` données invalides → erreurs
    - User avec `onboarding_completed = true` → accès normal aux routes, pas de redirect onboarding
    - GET `/onboarding` quand déjà onboardé → redirect `/` (optionnel mais propre)

## Dev Notes

### Architecture du wizard — côté client

Le wizard est **entièrement côté client**. Les 4 étapes sont dans un seul composant React avec un state local. Un seul POST est envoyé au serveur à la fin (étape 4 → "Terminer"). Pas de sauvegarde intermédiaire.

Pourquoi : simplicité, pas besoin de gérer un état partiel en DB, et l'onboarding < 1 minute.

### Middleware onboarding — ordre d'application

```typescript
// start/routes.ts
router
  .group(() => {
    // Routes onboarding (exemptées du middleware onboarding)
    router.get('/onboarding', [OnboardingController, 'show'])
    router.post('/onboarding', [OnboardingController, 'complete'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [DashboardController, 'index'])
    // ... autres routes protégées
  })
  .use([middleware.auth(), middleware.onboarding()])
```

L'idée : les routes onboarding sont protégées par auth mais PAS par le middleware onboarding (sinon boucle infinie). Les routes normales passent par les deux middlewares.

### Sports — données depuis la DB

Le controller charge les sports depuis la DB via `ListSports` use case + `SportRepository`. La règle depcruise `controllers-no-direct-infra` interdit l'import direct du modèle Lucid `Sport`.

### Piège JSONB

Ne pas utiliser `prepare: JSON.stringify` sur une colonne `jsonb` — le driver pg sérialise déjà automatiquement les objets JS. Double-sérialisation → erreur 500.

### Piège `user_profile_sports.created_at`

La migration déclare `created_at` NOT NULL sans `defaultTo()`. Il faut le passer explicitement dans l'insert raw : `{ created_at: new Date() }`.

### Modèle User — ajouter `onboardingCompleted` au modèle Lucid

Le modèle Lucid `User` doit exposer la colonne `onboarding_completed`. Vérifier le mapping camelCase.

### Mock UserRepository factorisé

`tests/helpers/mock_user_repository.ts` — source unique pour tous les tests unitaires. Évite la propagation des erreurs TS lors de l'ajout d'une méthode abstraite au port.

### Fichiers à créer / modifier

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créer    | `app/domain/interfaces/user_profile_repository.ts` |
| Créer    | `app/domain/interfaces/sport_repository.ts`      |
| Créer    | `app/models/user_profile.ts`                     |
| Créer    | `app/repositories/lucid_user_profile_repository.ts` |
| Créer    | `app/repositories/lucid_sport_repository.ts`     |
| Créer    | `app/use_cases/onboarding/complete_onboarding.ts` |
| Créer    | `app/use_cases/sports/list_sports.ts`            |
| Créer    | `app/middleware/onboarding_middleware.ts`         |
| Créer    | `app/controllers/onboarding/onboarding_controller.ts` |
| Créer    | `app/validators/onboarding/complete_onboarding_validator.ts` |
| Créer    | `inertia/pages/Onboarding/Wizard.tsx`            |
| Modifier | `app/domain/entities/user_profile.ts` (finaliser) |
| Modifier | `app/domain/interfaces/user_repository.ts` (markOnboardingCompleted) |
| Modifier | `app/repositories/lucid_user_repository.ts` (implémenter) |
| Modifier | `app/models/user.ts` (relation hasOne profile)   |
| Modifier | `providers/app_provider.ts` (bindings UserProfileRepository + SportRepository) |
| Modifier | `start/routes.ts` (routes onboarding + middleware) |
| Modifier | `start/kernel.ts` (enregistrer onboarding middleware) |
| Modifier | `database/seeders/user_seeder.ts` (onboardingCompleted: true pour les seedés) |
| Créer    | `tests/helpers/mock_user_repository.ts`          |
| Créer    | `tests/unit/use_cases/onboarding/complete_onboarding.spec.ts` |
| Créer    | `tests/functional/onboarding/wizard.spec.ts`     |

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow 1 : Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#OnboardingWizard component]
- [Source: _bmad-output/epics/epic-3-gestion-utilisateurs.md#Story 3.5]

## Dev Agent Record

### Implementation Notes

- `UserProfile` entité étendue avec `sportId: number` — association sport stockée via table pivot `user_profile_sports`
- `SportRepository` + `LucidSportRepository` + `ListSports` ajoutés pour respecter la règle `controllers-no-direct-infra`
- Transaction DB dans `LucidUserProfileRepository.create()` : insert `user_profiles` + `user_profile_sports` atomiquement
- `user_profile_sports.created_at` passé explicitement (`new Date()`) car NOT NULL sans default en migration
- Colonne `preferences` (jsonb) : pas de `prepare`/`consume` custom — le driver pg sérialise automatiquement
- `database/seeders/user_seeder.ts` mis à jour : `onboardingCompleted: true` pour que les tests existants ne soient pas bloqués par le nouveau middleware
- Mock `UserRepository` factorisé dans `tests/helpers/mock_user_repository.ts` — tous les tests unitaires existants migrés

### Completion Notes

89 tests passent, 0 échoue. Tous les ACs vérifiés. Pipeline CI complet (typecheck, lint, depcruise, tests) vert.

## File List

- `app/domain/entities/user_profile.ts` (modifié)
- `app/domain/interfaces/user_profile_repository.ts` (créé)
- `app/domain/interfaces/user_repository.ts` (modifié)
- `app/domain/interfaces/sport_repository.ts` (créé)
- `app/models/user_profile.ts` (créé)
- `app/models/user.ts` (modifié)
- `app/repositories/lucid_user_profile_repository.ts` (créé)
- `app/repositories/lucid_user_repository.ts` (modifié)
- `app/repositories/lucid_sport_repository.ts` (créé)
- `app/use_cases/onboarding/complete_onboarding.ts` (créé)
- `app/use_cases/sports/list_sports.ts` (créé)
- `app/middleware/onboarding_middleware.ts` (créé)
- `app/controllers/onboarding/onboarding_controller.ts` (créé)
- `app/validators/onboarding/complete_onboarding_validator.ts` (créé)
- `inertia/pages/Onboarding/Wizard.tsx` (créé)
- `providers/app_provider.ts` (modifié)
- `start/routes.ts` (modifié)
- `start/kernel.ts` (modifié)
- `database/seeders/user_seeder.ts` (modifié)
- `tests/helpers/mock_user_repository.ts` (créé)
- `tests/unit/use_cases/onboarding/complete_onboarding.spec.ts` (créé)
- `tests/functional/onboarding/wizard.spec.ts` (créé)
- `tests/unit/use_cases/admin/create_user.spec.ts` (modifié — mock factorisé)
- `tests/unit/use_cases/admin/delete_user.spec.ts` (modifié — mock factorisé)
- `tests/unit/use_cases/admin/get_user.spec.ts` (modifié — mock factorisé)
- `tests/unit/use_cases/admin/list_users.spec.ts` (modifié — mock factorisé)
- `tests/unit/use_cases/admin/update_user.spec.ts` (modifié — mock factorisé)
- `tests/unit/use_cases/login_user.spec.ts` (modifié — mock factorisé)
- `tests/unit/use_cases/profile/change_password.spec.ts` (modifié — mock factorisé)
- `tests/unit/use_cases/register_user.spec.ts` (modifié — mock factorisé)

## Change Log

- 2026-02-24 : Implémentation story 3.5 — wizard d'onboarding 4 étapes, middleware, use case, tests (89 tests verts)
