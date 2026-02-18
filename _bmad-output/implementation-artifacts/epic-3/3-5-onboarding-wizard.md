# Story 3.5 : Onboarding wizard (premier login)

Status: ready-for-dev

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

- [ ] Task 1 : Domain — entité UserProfile complète + port UserProfileRepository (AC: #6)
  - [ ] Finaliser `app/domain/entities/user_profile.ts` si pas déjà complet
  - [ ] Créer `app/domain/interfaces/user_profile_repository.ts` (classe abstraite) avec `create(profile): Promise<UserProfile>`
  - [ ] Ajouter `markOnboardingCompleted(userId: number): Promise<void>` au port `UserRepository`

- [ ] Task 2 : Repository UserProfile (AC: #6)
  - [ ] Créer modèle Lucid `app/models/user_profile.ts` avec relation `belongsTo(User)`
  - [ ] Ajouter relation `hasOne(UserProfile)` dans le modèle `User`
  - [ ] Créer `app/repositories/lucid_user_profile_repository.ts` extends `UserProfileRepository`
  - [ ] Implémenter `create()` — crée une entrée `user_profiles`
  - [ ] Implémenter `markOnboardingCompleted()` dans `LucidUserRepository` — `UPDATE users SET onboarding_completed = true`
  - [ ] Binding IoC dans `AppProvider`

- [ ] Task 3 : Use Case `CompleteOnboarding` (AC: #6)
  - [ ] Créer `app/use_cases/onboarding/complete_onboarding.ts`
  - [ ] Injecter `UserProfileRepository` + `UserRepository`
  - [ ] Créer le `user_profile` avec les données du wizard
  - [ ] Appeler `markOnboardingCompleted(userId)`
  - [ ] Tout dans une transaction si possible

- [ ] Task 4 : Middleware onboarding (AC: #1, #8)
  - [ ] Créer `app/middleware/onboarding_middleware.ts`
  - [ ] Si `auth.user.onboardingCompleted === false` ET la route n'est pas `/onboarding/*` ni `/logout` → redirect `/onboarding`
  - [ ] Enregistrer dans `start/kernel.ts`
  - [ ] Appliquer après le middleware auth sur les routes protégées

- [ ] Task 5 : Routes + Controller (AC: #1, #2-#6)
  - [ ] Ajouter routes (protégées par auth, PAS par onboarding middleware) :
    - `GET /onboarding` → `OnboardingController.show`
    - `POST /onboarding` → `OnboardingController.complete`
  - [ ] `show` : charger la liste des sports depuis la DB, render `Onboarding/Wizard`
  - [ ] `complete` : valider → use case → redirect `/`
  - [ ] Passer les sports comme prop : `{ sports: [{ id, name, slug }] }`

- [ ] Task 6 : Validator (AC: #2-#5)
  - [ ] Créer `app/validators/onboarding/complete_onboarding_validator.ts`
  - [ ] Champs : `sport_id` (number, exists in sports), `level` (enum: beginner/intermediate/advanced), `objective` (string, optional), `preferred_unit` (enum: km_h/min_km)

- [ ] Task 7 : Page React Onboarding/Wizard (AC: #2-#5, #7)
  - [ ] Créer `inertia/pages/Onboarding/Wizard.tsx`
  - [ ] State local pour l'étape courante (1 à 4) et les réponses
  - [ ] **Étape 1 — Sport :** Grille d'icônes cliquables générée depuis la prop `sports`. Chaque sport = une carte avec icône + nom
  - [ ] **Étape 2 — Niveau :** 3 cartes : "Je débute" (beginner) / "Je cours régulièrement" (intermediate) / "Je m'entraîne sérieusement" (advanced)
  - [ ] **Étape 3 — Objectif :** Choix d'objectifs prédéfinis + option "Pas d'objectif précis" (skip). Exemples : "Progresser en endurance", "Courir plus vite", "Reprendre après une pause"
  - [ ] **Étape 4 — Préférences :** Toggle/radio entre km/h et min/km, avec valeur par défaut min/km
  - [ ] **Barre de progression :** 4 dots en haut, dot actif mis en surbrillance
  - [ ] **Navigation :** Bouton "Suivant" + bouton "Retour" (sauf étape 1). "Terminer" sur l'étape 4
  - [ ] Au clic "Terminer" → `useForm().post('/onboarding')` avec toutes les données
  - [ ] Layout dédié (pas `MainLayout` — le wizard est plein écran, sobre)

- [ ] Task 8 : Tests (AC: #1, #6, #8)
  - [ ] `tests/unit/use_cases/onboarding/complete_onboarding.spec.ts` : crée le profil + marque onboarding completed
  - [ ] `tests/functional/onboarding/wizard.spec.ts` :
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

Le controller charge les sports depuis la DB et les passe comme prop au wizard. Ça permet d'ajouter des sports plus tard sans changer le frontend.

```typescript
// OnboardingController.show
const sports = await Sport.all() // ou via un repository si on veut rester clean
return inertia.render('Onboarding/Wizard', { sports: sports.map(s => ({ id: s.id, name: s.name, slug: s.slug })) })
```

### Modèle User — ajouter `onboardingCompleted` au modèle Lucid

Le modèle Lucid `User` doit exposer la colonne `onboarding_completed`. Vérifier le mapping camelCase.

### Fichiers à créer / modifier

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créer    | `app/domain/interfaces/user_profile_repository.ts` |
| Créer    | `app/models/user_profile.ts`                     |
| Créer    | `app/repositories/lucid_user_profile_repository.ts` |
| Créer    | `app/use_cases/onboarding/complete_onboarding.ts` |
| Créer    | `app/middleware/onboarding_middleware.ts`         |
| Créer    | `app/controllers/onboarding/onboarding_controller.ts` |
| Créer    | `app/validators/onboarding/complete_onboarding_validator.ts` |
| Créer    | `inertia/pages/Onboarding/Wizard.tsx`            |
| Modifier | `app/domain/entities/user_profile.ts` (finaliser) |
| Modifier | `app/domain/interfaces/user_repository.ts` (markOnboardingCompleted) |
| Modifier | `app/repositories/lucid_user_repository.ts` (implémenter) |
| Modifier | `app/models/user.ts` (colonne onboarding_completed + relation hasOne profile) |
| Modifier | `providers/app_provider.ts` (binding UserProfileRepository) |
| Modifier | `start/routes.ts` (routes onboarding + middleware) |
| Modifier | `start/kernel.ts` (enregistrer onboarding middleware) |
| Créer    | `tests/unit/use_cases/onboarding/complete_onboarding.spec.ts` |
| Créer    | `tests/functional/onboarding/wizard.spec.ts`     |

### UX — références design

- Barre de progression : 4 dots, cf. UX spec "Wizard par étapes"
- Étape 1 grille icônes : cf. UX spec "Step 1 : Quel sport pratiques-tu ? Sélection visuelle icônes"
- Étape 2 trois cartes : cf. UX spec "Step 2 : Quel est ton niveau ? Débutant / Intermédiaire / Confirmé"
- Durée cible < 1 minute

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow 1 : Onboarding]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#OnboardingWizard component]
- [Source: _bmad-output/epics/epic-3-gestion-utilisateurs.md#Story 3.5]
