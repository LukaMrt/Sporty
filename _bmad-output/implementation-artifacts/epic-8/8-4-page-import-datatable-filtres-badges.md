# Story 8.4 : Page Import (DataTable, filtres, badges)

Status: review

## Story

As a **utilisateur connecte**,
I want **un tableau interactif de mes seances Strava avec filtres et etats visuels**,
so that **je peux parcourir, filtrer et distinguer mes seances avant de les importer** (FR8, FR9, FR10).

## Acceptance Criteria

1. **Given** j'ai des activites en staging **When** la page Import se charge **Then** un Shadcn DataTable affiche : date, nom, type de sport (mappe), duree, distance, statut
2. **Given** chaque ligne **When** elle s'affiche **Then** un badge colore selon le statut : bleu "Nouvelle" / vert "Importee" / gris "Ignoree"
3. **Given** le tableau **When** je clique sur un en-tete **Then** il est triable par date, type, distance
4. **Given** je veux filtrer par dates **When** j'utilise le selecteur **Then** seules les activites dans la plage sont affichees, defaut dernier mois
5. **Given** je suis sur mobile (< 768px) **When** la page se charge **Then** le DataTable est remplace par une vue cards
6. **Given** je suis sur desktop **When** je navigue au clavier **Then** les lignes sont focusables et selectionnables
7. **Given** les zones tactiles **When** je les mesure **Then** badges et checkboxes font minimum 44x44px

## Tasks / Subtasks

- [x] Task 1 : DataTable dans Connectors/Show (AC: #1, #2)
  - [x] Installer TanStack Table si necessaire
  - [x] DataTable avec colonnes : date, nom, type, duree, distance, statut
  - [x] Composant Badge colore par statut
- [x] Task 2 : Tri (AC: #3)
  - [x] Tri par date, type, distance via TanStack Table
- [x] Task 3 : Filtre par dates (AC: #4)
  - [x] Selecteur date debut / date fin
  - [x] Defaut : dernier mois
- [x] Task 4 : Vue responsive (AC: #5, #6, #7)
  - [x] Vue cards mobile (< 768px)
  - [x] Navigation clavier desktop
  - [x] Zones tactiles 44x44px minimum
- [x] Task 5 : Navigation
  - [x] Lien "Connecteurs" dans le menu principal (deja present — Import integre dans Connectors/Show)

## Dev Notes

### Badges

| Status | Couleur | Label |
|--------|---------|-------|
| new | Bleu | Nouvelle |
| imported | Vert | Importee |
| ignored | Gris | Ignoree |

### TanStack Table + Shadcn DataTable

Utiliser le composant DataTable de Shadcn/ui qui wrappe TanStack Table. Offre tri, filtres, pagination, et selection out-of-the-box.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.4]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

## Dev Agent Record

### Decisions

- **Import/Index supprimee** : suite au refactoring du commit `eaf7a90`, la page Import standalone n'existe plus. Le DataTable est integre dans `Connectors/Show` (`/connectors/strava`). Task 5 satisfaite par le lien "Connecteurs" deja present dans le menu.
- **Format rawData** : le `rawData` stocke un `ConnectorActivity` (format intermediaire : `startDate`, `sportType`, `distanceMeters`, `durationSeconds`), ni le format Strava brut ni le `MappedActivity`. Le mapping controller utilise ce format.
- **import_controller.ts supprime** : fichier orphelin apres suppression de la route `/import/activities`.
- **Tests mis a jour** : `import_activities.spec.ts` migre vers `/connectors/strava` avec les nouvelles assertions sur `stravaStatus` et `activities`.

### Files Modified

- `app/controllers/connectors/strava_connector_controller.ts` — passage de `activityCount` a `activities[]` mappe depuis rawData
- `app/controllers/import/import_controller.ts` — supprime (orphelin)
- `inertia/pages/Connectors/Show.tsx` — integration du DataTable
- `inertia/components/import/ActivitiesDataTable.tsx` — cree (DataTable TanStack + vue mobile)
- `inertia/components/import/ActivityStatusBadge.tsx` — cree
- `inertia/components/import/ActivityCard.tsx` — cree (vue mobile cards)
- `inertia/components/ui/badge.tsx` — cree
- `inertia/css/app.css` — ajout `cursor: pointer` sur `::-webkit-calendar-picker-indicator`
- `resources/lang/fr/import.json` — cree
- `resources/lang/en/import.json` — cree
- `tests/functional/import/import_activities.spec.ts` — route et assertions mises a jour

### Completion Notes

Toutes les ACs satisfaites. CI verte (311 tests passes). DataTable TanStack avec tri client-side sur date/type/distance, filtre dates avec defaut dernier mois, vue cards mobile < 768px, navigation clavier (tabIndex + focus-visible), zones tactiles min-h-[44px].
