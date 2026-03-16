# Story 11.2 : Page explicative — Mesurer FC max et VMA

Status: pending

## Story

As a **utilisateur connecte**,
I want **comprendre comment mesurer ma FC max et ma VMA avec des methodes fiables**,
so that **je renseigne des valeurs precises qui rendent les calculs pertinents**.

## Acceptance Criteria

1. **Given** je clique sur "Comment mesurer ?" depuis mon profil **When** la page s'affiche **Then** je vois des sections claires pour FC max et VMA
2. **Given** la section FC max **When** je la lis **Then** je vois : formule estimative Tanaka (208 - 0.7 × age) avec avertissement, protocole test terrain (echauffement 15min → 3 cotes 2min effort max → FC pic), conseil de privilegier le test reel
3. **Given** la section VMA **When** je la lis **Then** je vois : explication simple, test demi-Cooper (6min, distance × 10 = VMA), test Cooper (12min, distance / 12 × 60), mention test VAMEVAL
4. **Given** le contenu **When** je le parcours **Then** le ton est pedagogique et accessible, pas de jargon medical, avec liens vers des sources scientifiques

## Tasks / Subtasks

- [ ] Task 1 : Route et controller (AC: #1)
  - [ ] Ajouter route GET `/profile/physiology-guide`
  - [ ] Controller thin qui rend la page Inertia
- [ ] Task 2 : Page React (AC: #1, #2, #3, #4)
  - [ ] Creer `inertia/pages/Profile/PhysiologyGuide.tsx`
  - [ ] Section FC max avec formule Tanaka, protocole test terrain, avertissements
  - [ ] Section VMA avec explication, tests Cooper et demi-Cooper, VAMEVAL
  - [ ] Ton pedagogique, sources scientifiques en bas de page
- [ ] Task 3 : Navigation (AC: #1)
  - [ ] Lien "Comment mesurer ?" dans la page Profil (Story 11.1) pointe vers cette page

## Dev Notes

### Contenu scientifique

**FC max :**
- Formule Tanaka (2001) : `208 - 0.7 × age` — plus precise que la vieille `220 - age`
- Source : Tanaka H, Monahan KD, Seals DR. "Age-predicted maximal heart rate revisited." JACC 2001.
- Le test terrain reste la reference : 3 repetitions de 2min en cote a effort max apres 15min d'echauffement

**VMA :**
- Test demi-Cooper : courir 6 minutes a fond, distance (km) × 10 = VMA
- Test Cooper : courir 12 minutes a fond, distance (m) / 12 × 60 / 1000 = VMA
- VAMEVAL : test progressif sur piste avec paliers de 0.5 km/h toutes les minutes

### UX

Page statique, pas de formulaire. Style documentation/guide. Mobile-friendly avec sections pliables.

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.2]
