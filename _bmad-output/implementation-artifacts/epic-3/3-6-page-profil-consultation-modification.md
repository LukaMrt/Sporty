# Story 3.6 : Page profil — Consultation et modification

Status: ready-for-dev

## Story

As a **utilisateur connecté**,
I want **consulter et modifier mon profil sportif et mes préférences à tout moment**,
so that **je peux ajuster mes réglages sans repasser par le wizard** (FR7, FR8, FR9).

## Acceptance Criteria

1. **Given** je navigue vers l'onglet Profil **When** la page se charge **Then** je vois mes informations actuelles : nom, email, sport, niveau, objectif, préférences d'unités
2. **Given** je modifie un champ (ex: niveau, unités) et je sauvegarde **When** la requête est traitée **Then** mes modifications sont enregistrées **And** un feedback confirme ("Profil mis à jour")
3. **Given** je modifie mon nom ou email **When** je sauvegarde **Then** les modifications sont enregistrées
4. **Given** je modifie mon email avec un email déjà utilisé **When** je sauvegarde **Then** une erreur s'affiche
5. **Given** je change mes unités de km/h à min/km **When** je retourne sur l'accueil **Then** les données s'afficheront dans les nouvelles unités (applicable quand l'Epic 6 sera en place)

## Tasks / Subtasks

- [ ] Task 1 : Domain — étendre UserProfileRepository (AC: #1, #2)
  - [ ] Ajouter `findByUserId(userId: number): Promise<UserProfile | null>` au port `UserProfileRepository`
  - [ ] Ajouter `update(userId: number, data: Partial<UserProfile>): Promise<UserProfile>` au port

- [ ] Task 2 : Repository — implémenter (AC: #1, #2)
  - [ ] `findByUserId()` dans `LucidUserProfileRepository`
  - [ ] `update()` dans `LucidUserProfileRepository`

- [ ] Task 3 : Use Cases (AC: #1, #2, #3)
  - [ ] Créer `app/use_cases/profile/get_profile.ts` : charge le user + son profil sportif
  - [ ] Créer `app/use_cases/profile/update_profile.ts` : met à jour les infos perso (nom, email) + le profil sportif (sport, niveau, objectif, unités)

- [ ] Task 4 : Validators (AC: #2, #3, #4)
  - [ ] Créer `app/validators/profile/update_profile_validator.ts`
  - [ ] Champs user : `full_name` (string, optional, minLength 2), `email` (email, optional, unique sauf soi-même)
  - [ ] Champs profil : `sport_id` (number, optional, exists in sports), `level` (enum, optional), `objective` (string, optional, nullable), `preferred_unit` (enum, optional)

- [ ] Task 5 : Routes + Controller (AC: #1, #2, #3)
  - [ ] Modifier la route `/profile` existante : `GET /profile` → `ProfileController.show`
  - [ ] Ajouter `PUT /profile` → `ProfileController.update`
  - [ ] Créer `app/controllers/profile/profile_controller.ts`
  - [ ] `show` : charger user + profil + sports → render `Profile/Edit`
  - [ ] `update` : valider → use case → flash success → redirect back

- [ ] Task 6 : Page React Profile/Edit complète (AC: #1, #2, #3)
  - [ ] Remplacer/compléter `inertia/pages/Profile/Edit.tsx` (déjà amorcée en Story 3.4)
  - [ ] **Section "Informations personnelles" :** nom, email (formulaire)
  - [ ] **Section "Profil sportif" :** sport (select depuis la liste), niveau (3 options), objectif (texte libre ou prédéfini), unités (toggle km/h ou min/km)
  - [ ] **Section "Mot de passe" :** le composant `ChangePasswordForm` de la Story 3.4
  - [ ] **Section "Administration" (conditionnel) :** lien vers `/admin/users` si `auth.user.role === 'admin'`
  - [ ] Bouton "Enregistrer" pour les infos perso + profil sportif (un seul formulaire)
  - [ ] Passer les `sports` comme prop pour le select

- [ ] Task 7 : Tests (AC: #1, #2, #3, #4)
  - [ ] `tests/unit/use_cases/profile/get_profile.spec.ts`
  - [ ] `tests/unit/use_cases/profile/update_profile.spec.ts`
  - [ ] `tests/functional/profile/profile.spec.ts` :
    - GET `/profile` → 200 + données user + profil
    - PUT `/profile` valide → données mises à jour en DB
    - PUT `/profile` email dupliqué → erreur
    - PUT `/profile` non connecté → redirect `/login`

## Dev Notes

### Architecture de la page profil

La page profil regroupe tout en un seul écran avec des sections distinctes :

1. **Infos personnelles** (nom, email) — formulaire Inertia `put('/profile')`
2. **Profil sportif** (sport, niveau, objectif, unités) — même formulaire que les infos perso
3. **Mot de passe** — formulaire séparé `put('/profile/password')` (Story 3.4)
4. **Lien admin** — conditionnel, pas un formulaire

### Chargement des données

```typescript
// ProfileController.show
const user = auth.user!
const profile = await getProfile.execute(user.id)
const sports = await Sport.all()
return inertia.render('Profile/Edit', {
  user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
  profile: profile ? { sportId: profile.sportId, level: profile.level, objective: profile.objective, preferredUnit: profile.preferredUnit } : null,
  sports: sports.map(s => ({ id: s.id, name: s.name })),
})
```

### Un seul POST pour user + profil

Le use case `UpdateProfile` met à jour les deux en une seule opération. Le controller reçoit un seul formulaire avec les champs user + profil mélangés. Le use case sépare et dispatche.

### Fichiers à créer / modifier

| Action   | Fichier                                          |
|----------|--------------------------------------------------|
| Créer    | `app/use_cases/profile/get_profile.ts`           |
| Créer    | `app/use_cases/profile/update_profile.ts`        |
| Créer    | `app/validators/profile/update_profile_validator.ts` |
| Créer    | `app/controllers/profile/profile_controller.ts`  |
| Modifier | `app/domain/interfaces/user_profile_repository.ts` (findByUserId, update) |
| Modifier | `app/repositories/lucid_user_profile_repository.ts` (implémenter) |
| Modifier | `inertia/pages/Profile/Edit.tsx` (page complète) |
| Modifier | `start/routes.ts` (GET/PUT /profile → ProfileController) |
| Créer    | `tests/unit/use_cases/profile/get_profile.spec.ts` |
| Créer    | `tests/unit/use_cases/profile/update_profile.spec.ts` |
| Créer    | `tests/functional/profile/profile.spec.ts`       |

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Profil]
- [Source: _bmad-output/epics/epic-3-gestion-utilisateurs.md#Story 3.6]
- [Source: Story 3.4 — ChangePasswordForm déjà créé]
- [Source: Story 3.5 — UserProfileRepository déjà créé]
