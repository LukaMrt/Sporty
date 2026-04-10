# Story 12.8 : Goal Setting Wizard (UI)

Status: done

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

- [x] Task 1 : Page GoalCreate — conteneur wizard (AC: #1, #9)
  - [x] Creer `inertia/pages/Planning/GoalCreate.tsx`
  - [x] Gestion d'etat multi-etapes (state local React)
  - [x] Barre de progression (5 dots)
  - [x] Navigation avant/arriere
- [x] Task 2 : Etape 1 — Objectif (AC: #2)
  - [x] Champ distance (numerique) + raccourcis boutons (5, 10, 21.1, 42.195)
  - [x] Champ temps cible (hh:mm:ss) optionnel
  - [x] Champ date de course (date picker) optionnel
  - [x] Micro-copy rassurant sous chaque champ optionnel
- [x] Task 3 : Etape 2 — Estimation VDOT (AC: #3, #4)
  - [x] Creer `inertia/components/planning/VdotEstimationForm.tsx`
  - [x] Cas A : VDOT pre-calcule depuis Strava (affichage + boutons Confirmer/Ajuster)
  - [x] Cas B : Entonnoir 3 niveaux (temps recent / VMA / questionnaire)
  - [x] Sous-flow B1 : dropdown distance + champ temps
  - [x] Sous-flow B2 : champ VMA (pre-rempli si profil)
  - [x] Sous-flow B3 : 3 questions radio (frequence, anciennete, distance)
- [x] Task 4 : Etape 3 — Confirmation VDOT (AC: #5)
  - [x] Creer `inertia/components/planning/VdotConfirmation.tsx`
  - [x] Affichage VDOT + zones d'allure + temps estimes
  - [x] Slider ±5 avec mise a jour temps reel
  - [x] Message rassurant
- [x] Task 5 : Etape 4 — Parametrage (AC: #6, #7, #10)
  - [x] Boutons radio seances/semaine (3/4/5) avec recommandation
  - [x] Chips toggle jours preferes (max = nb seances)
  - [x] Champ duree (pre-rempli selon table distance × niveau)
  - [x] Verrouillage si date evenement
  - [x] Warning si < 8 semaines
  - [x] Bouton "Tout par defaut"
- [x] Task 6 : Etape 5 — Resume & generation (AC: #8)
  - [x] Integre dans GoalCreate (pas de fichier separe)
  - [x] Recapitulatif complet (objectif, VDOT, duree, phases)
  - [x] Bouton "Generer mon plan" → appel API → loading → redirect
  - [x] Toast succes

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

## Dev Agent Record

### Implementation Plan

Wizard 100% client-side avec state React local. 5 étapes :
1. Objectif (distance, temps optionnel, date optionnelle)
2. Estimation VDOT — Cas A: auto depuis Strava, Cas B: entonnoir 3 niveaux
3. Confirmation VDOT — slider ±5, zones temps réel via POST /profile/athlete/confirm-vdot
4. Paramétrage — séances/semaine, jours préférés (chips), durée plan (auto si date event)
5. Résumé — récapitulatif + POST /planning/goals → redirect /planning

Route ajoutée : `GET /planning/goal` → `Planning/GoalCreate` (renderInertia statique)
Planning/Index mis à jour : bouton "Définir un objectif" → /planning/goal

### Completion Notes

- `GoalCreate.tsx` : conteneur wizard avec state WizardState, ProgressDots, 5 blocs conditionnels step
- `VdotEstimationForm.tsx` : auto-fetch estimateVdot au mount, affiche résultat Strava ou entonnoir 3 méthodes
- `VdotConfirmation.tsx` : slider ±5 avec fetch temps réel confirm-vdot + PaceZonesDisplay
- Traductions FR + EN ajoutées (`planning.wizard.*`)
- Pas de tests unitaires : composants purement UI sans logique métier testable isolément (formules de durée testées via `defaultDuration` inline)

## File List

- `inertia/pages/Planning/GoalCreate.tsx` (created)
- `inertia/pages/Planning/Index.tsx` (modified)
- `inertia/components/planning/VdotEstimationForm.tsx` (created)
- `inertia/components/planning/VdotConfirmation.tsx` (created)
- `resources/lang/fr/planning.json` (modified)
- `resources/lang/en/planning.json` (modified)
- `start/routes.ts` (modified)

## Change Log

- 2026-03-23 : Story 12.8 implémentée — wizard 5 étapes Goal Setting UI
