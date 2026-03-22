# Story 12.8 : Goal Setting Wizard (UI)

Status: pending

## Story

As a **coureur**,
I want **un wizard guide en 5 etapes (objectif → estimation VDOT → confirmation → parametrage → resume)**,
So that **je definis facilement mon objectif et recois un plan en moins de 3 minutes**.

## Acceptance Criteria

1. **Given** je suis sur `/planning` sans plan actif **When** je clique "Definir un objectif" **Then** le wizard demarre a l'etape 1
2. **Given** l'etape 1 (Objectif) **When** je saisis une distance (raccourcis 5K/10K/Semi/Marathon ou saisie libre) **Then** le bouton Suivant est actif — temps cible et date sont optionnels
3. **Given** l'etape 2 (Estimation niveau) **When** j'ai ≥ 3 seances Strava eligibles **Then** le VDOT est pre-estime automatiquement avec details (semi estime, 10K estime, allure E)
4. **Given** l'etape 2 **When** je n'ai pas assez de donnees Strava **Then** un entonnoir 3 niveaux est propose (temps recent / VMA / questionnaire)
5. **Given** l'etape 3 (Confirmation VDOT) **When** je vois le profil estime **Then** je peux ajuster via slider ±5 avec mise a jour temps reel des zones et estimations
6. **Given** l'etape 4 (Parametrage) **When** je personnalise le plan **Then** je peux choisir seances/semaine, jours preferes, duree du plan — ou cliquer "Tout par defaut"
7. **Given** l'etape 4 **When** une date d'evenement est definie **Then** la duree du plan est calculee automatiquement et verrouillee
8. **Given** l'etape 5 (Resume) **When** je clique "Generer mon plan" **Then** le plan est genere et je suis redirige vers `/planning`
9. **Given** n'importe quelle etape **When** je clique Retour **Then** je reviens a l'etape precedente avec les donnees conservees
10. **Given** la duree saisie est < 8 semaines **When** je valide **Then** un warning est affiche

## Tasks / Subtasks

- [ ] Task 1 : Page GoalCreate — conteneur wizard (AC: #1, #9)
  - [ ] Creer `inertia/pages/Planning/GoalCreate.tsx`
  - [ ] Gestion d'etat multi-etapes (state local React)
  - [ ] Barre de progression (5 dots)
  - [ ] Navigation avant/arriere
- [ ] Task 2 : Etape 1 — Objectif (AC: #2)
  - [ ] Champ distance (numerique) + raccourcis boutons (5, 10, 21.1, 42.195)
  - [ ] Champ temps cible (hh:mm:ss) optionnel
  - [ ] Champ date de course (date picker) optionnel
  - [ ] Micro-copy rassurant sous chaque champ optionnel
- [ ] Task 3 : Etape 2 — Estimation VDOT (AC: #3, #4)
  - [ ] Creer `inertia/components/planning/VdotEstimationForm.tsx`
  - [ ] Cas A : VDOT pre-calcule depuis Strava (affichage + boutons Confirmer/Ajuster)
  - [ ] Cas B : Entonnoir 3 niveaux (temps recent / VMA / questionnaire)
  - [ ] Sous-flow B1 : dropdown distance + champ temps
  - [ ] Sous-flow B2 : champ VMA (pre-rempli si profil)
  - [ ] Sous-flow B3 : 3 questions radio (frequence, anciennete, distance)
- [ ] Task 4 : Etape 3 — Confirmation VDOT (AC: #5)
  - [ ] Creer `inertia/components/planning/VdotConfirmation.tsx`
  - [ ] Affichage VDOT + zones d'allure + temps estimes
  - [ ] Slider ±5 avec mise a jour temps reel
  - [ ] Message rassurant
- [ ] Task 5 : Etape 4 — Parametrage (AC: #6, #7, #10)
  - [ ] Boutons radio seances/semaine (3/4/5) avec recommandation
  - [ ] Chips toggle jours preferes (max = nb seances)
  - [ ] Champ duree (pre-rempli selon table distance × niveau)
  - [ ] Verrouillage si date evenement
  - [ ] Warning si < 8 semaines
  - [ ] Bouton "Tout par defaut"
- [ ] Task 6 : Etape 5 — Resume & generation (AC: #8)
  - [ ] Creer `inertia/pages/Planning/PlanPreview.tsx` ou integrer dans GoalCreate
  - [ ] Recapitulatif complet (objectif, VDOT, duree, phases)
  - [ ] Bouton "Generer mon plan" → appel API → loading → redirect
  - [ ] Toast succes

## Dev Notes

### Durees de plan par defaut (sans date d'evenement)

| Distance | Debutant | Intermediaire | Avance |
|----------|----------|---------------|--------|
| 5K       | 8 sem    | 8 sem         | 8 sem  |
| 10K      | 12 sem   | 8 sem         | 8 sem  |
| Semi     | 16 sem   | 12 sem        | 10 sem |
| Marathon | 20 sem   | 16 sem        | 14 sem |

Le niveau est derive du VDOT : < 30 debutant, 30-45 intermediaire, > 45 avance.

### Le wizard est une seule page React avec state local

Pas de navigation serveur entre les etapes — tout est gere cote client. L'appel API se fait uniquement a l'etape 5 (generation).

### References

- [UX Design sections 4.1-4.6](/_bmad-output/planning-artifacts/planning-module/ux-design-planning-module.md#4)
- [PRD FR11-FR16](/_bmad-output/planning-artifacts/planning-module/prd-planning-module.md)
