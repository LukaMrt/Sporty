# Story 11.1 : Profil physiologique (FC max, VMA)

Status: review

## Story

As a **utilisateur connecte**,
I want **renseigner ma FC max et ma VMA dans mon profil**,
so that **le systeme peut calculer mes zones FC et mes allures cibles**.

## Acceptance Criteria

1. **Given** je suis sur ma page de profil **When** je regarde la section "Parametres physiologiques" **Then** je vois deux champs : FC max (bpm) et VMA (km/h), avec les valeurs actuelles ou vides
2. **Given** je renseigne ma FC max (ex: 190 bpm) et ma VMA (ex: 16 km/h) **When** je sauvegarde **Then** les valeurs sont persistees dans mon profil **And** un feedback confirme "Profil mis a jour"
3. **Given** je n'ai pas renseigne ma FC max **When** le systeme tente de calculer mes zones FC **Then** les zones ne sont pas affichees et un message invite a configurer la FC max dans le profil
4. **Given** je clique sur "Comment mesurer ?" a cote d'un champ **When** la page d'aide s'ouvre **Then** je vois des explications basees sur des methodes scientifiques (voir Story 11.2)

## Tasks / Subtasks

- [x] Task 1 : Migration DB (AC: #1, #2)
  - [x] Ajouter `max_heart_rate` (integer, nullable) a `user_profiles`
  - [x] Ajouter `vma` (float, nullable) a `user_profiles`
  - [x] Mettre a jour le modele Lucid `UserProfile` avec les nouvelles colonnes
  - [x] Mettre a jour l'entite domain `UserProfile` avec `maxHeartRate` et `vma`
- [x] Task 2 : Backend — use case et validation (AC: #2)
  - [x] Etendre le validator profil pour accepter `maxHeartRate` (entier, 100-250, optionnel) et `vma` (float, 5-30, optionnel)
  - [x] Etendre le use case `UpdateUserProfile` pour persister les nouvelles valeurs
  - [x] Mettre a jour le `UserProfileRepository` pour lire/ecrire les champs
- [x] Task 3 : Frontend — section "Parametres physiologiques" (AC: #1, #4)
  - [x] Ajouter la section dans la page Profil avec deux champs numeriques
  - [x] Lien "Comment mesurer ?" a cote de chaque champ (route vers Story 11.2)
  - [x] Feedback toast "Profil mis a jour" au succes

## Dev Notes

### Contraintes de validation

- FC max : entier entre 100 et 250 bpm (valeurs physiologiquement plausibles)
- VMA : float entre 5.0 et 30.0 km/h (du debutant a l'elite)
- Les deux champs sont optionnels — le profil fonctionne sans

### Impact downstream

Ces valeurs sont utilisees par Story 11.7 (calcul zones FC) et futures stories planning (allures cibles).

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.1]
- Entite existante : `app/domain/entities/user_profile.ts`
- Modele existant : `app/models/user_profile.ts`

## Dev Agent Record

### Implementation Plan

1. Migration additive `1772000000004_add_physiological_fields_to_user_profiles.ts`
2. Entité domain + modèle Lucid mis à jour avec `maxHeartRate` et `vma`
3. Repository : 3 méthodes (create/findByUserId/update) mises à jour
4. Validator : `max_heart_rate` (withoutDecimals, 100-250) et `vma` (5-30), optionnels/nullables
5. Use case `UpdateProfile` : input étendu, persistance des valeurs
6. Controller : transmission frontend ↔ use case
7. Frontend `Profile/Edit.tsx` : section dédiée avec champs numériques + lien "Comment mesurer ?"
8. Traductions FR + EN ajoutées

### Completion Notes

- Tous les objets `UserProfile` existants dans les tests mis à jour avec `maxHeartRate: null, vma: null`
- `CompleteOnboarding` mis à jour pour initialiser les champs à null
- 3 tests unitaires + 4 tests fonctionnels ajoutés, tous verts

### File List

- `database/migrations/1772000000004_add_physiological_fields_to_user_profiles.ts` (créé)
- `app/domain/entities/user_profile.ts` (modifié)
- `app/models/user_profile.ts` (modifié)
- `app/repositories/lucid_user_profile_repository.ts` (modifié)
- `app/validators/profile/update_profile_validator.ts` (modifié)
- `app/use_cases/profile/update_profile.ts` (modifié)
- `app/use_cases/onboarding/complete_onboarding.ts` (modifié)
- `app/controllers/profile/profile_controller.ts` (modifié)
- `inertia/pages/Profile/Edit.tsx` (modifié)
- `resources/lang/fr/profile.json` (modifié)
- `resources/lang/en/profile.json` (modifié)
- `tests/unit/use_cases/profile/update_profile.spec.ts` (modifié)
- `tests/unit/use_cases/profile/get_profile.spec.ts` (modifié)
- `tests/unit/use_cases/onboarding/complete_onboarding.spec.ts` (modifié)
- `tests/functional/profile/profile.spec.ts` (modifié)

### Change Log

- Story 11.1 implémentée — ajout FC max et VMA au profil physiologique (2026-03-16)
