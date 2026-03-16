# Story 11.1 : Profil physiologique (FC max, VMA)

Status: pending

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

- [ ] Task 1 : Migration DB (AC: #1, #2)
  - [ ] Ajouter `max_heart_rate` (integer, nullable) a `user_profiles`
  - [ ] Ajouter `vma` (float, nullable) a `user_profiles`
  - [ ] Mettre a jour le modele Lucid `UserProfile` avec les nouvelles colonnes
  - [ ] Mettre a jour l'entite domain `UserProfile` avec `maxHeartRate` et `vma`
- [ ] Task 2 : Backend — use case et validation (AC: #2)
  - [ ] Etendre le validator profil pour accepter `maxHeartRate` (entier, 100-250, optionnel) et `vma` (float, 5-30, optionnel)
  - [ ] Etendre le use case `UpdateUserProfile` pour persister les nouvelles valeurs
  - [ ] Mettre a jour le `UserProfileRepository` pour lire/ecrire les champs
- [ ] Task 3 : Frontend — section "Parametres physiologiques" (AC: #1, #4)
  - [ ] Ajouter la section dans la page Profil avec deux champs numeriques
  - [ ] Lien "Comment mesurer ?" a cote de chaque champ (route vers Story 11.2)
  - [ ] Feedback toast "Profil mis a jour" au succes

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
