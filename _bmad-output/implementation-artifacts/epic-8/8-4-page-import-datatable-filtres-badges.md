# Story 8.4 : Page Import (DataTable, filtres, badges)

Status: draft

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

- [ ] Task 1 : Page React `Import/Index` (AC: #1, #2)
  - [ ] Installer TanStack Table si necessaire
  - [ ] DataTable avec colonnes : date, nom, type, duree, distance, statut
  - [ ] Composant Badge colore par statut
- [ ] Task 2 : Tri (AC: #3)
  - [ ] Tri par date, type, distance via TanStack Table
- [ ] Task 3 : Filtre par dates (AC: #4)
  - [ ] Selecteur date debut / date fin
  - [ ] Defaut : dernier mois
- [ ] Task 4 : Vue responsive (AC: #5, #6, #7)
  - [ ] Vue cards mobile (< 768px)
  - [ ] Navigation clavier desktop
  - [ ] Zones tactiles 44x44px minimum
- [ ] Task 5 : Navigation
  - [ ] Lien "Import" dans le menu principal

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
