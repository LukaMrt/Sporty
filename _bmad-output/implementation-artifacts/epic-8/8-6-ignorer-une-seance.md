# Story 8.6 : Ignorer une seance

Status: review

## Story

As a **utilisateur connecte**,
I want **ignorer une seance que je ne veux pas importer**,
so that **elle ne pollue plus ma liste de seances a traiter** (FR13).

## Acceptance Criteria

1. **Given** une activite est en statut `new` **When** je clique "Ignorer" **Then** le statut passe a `ignored`, badge gris "Ignoree", toast confirme
2. **Given** une activite est en statut `ignored` **When** je clique "Restaurer" **Then** le statut repasse a `new`, badge bleu "Nouvelle"
3. **Given** j'ai des activites ignorees **When** je regarde le tableau **Then** elles sont visibles mais visuellement distinctes (badge gris, opacite reduite)

## Tasks / Subtasks

- [x] Task 1 : Route et controller ignore/restore (AC: #1, #2)
  - [x] Route `POST /import/activities/:id/ignore`
  - [x] Route `POST /import/activities/:id/restore`
- [x] Task 2 : Use case IgnoreActivity / RestoreActivity (AC: #1, #2)
  - [x] Mettre a jour le statut en base
- [x] Task 3 : Frontend (AC: #1, #2, #3)
  - [x] Bouton Ignorer sur les lignes `new`
  - [x] Bouton Restaurer (icone Undo2) sur les lignes `ignored`
  - [x] Style visuel distinct pour les lignes ignorees (opacite reduite)

## Dev Notes

### UX

Les activites ignorees restent visibles (toggle "Afficher les ignorees") pour permettre de les restaurer facilement. Elles sont visuellement distinctes (opacite 50%) mais pas cachees par defaut.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.6]

## Dev Agent Record

### Implementation Plan

- Port abstrait `ImportActivityRepository` : ajout `setIgnored(id)` et `setNew(id)`
- `LucidImportActivityRepository` : implementation des deux methodes
- Use cases `IgnoreActivity` et `RestoreActivity` (un fichier, une classe, une methode)
- Controller `ImportActivitiesController` avec methodes `ignore` et `restore`
- Routes `POST /import/activities/:id/ignore` et `POST /import/activities/:id/restore`
- Frontend : optimistic update via `useState` local, revert automatique sur erreur
- Badge intermediaire `importing` avec `animate-pulse` pendant le poll d'import
- Toggle "Afficher les ignorees" dans la barre de filtres (cache par defaut)
- Largeur fixe sur la colonne statut (120px) pour eviter les sauts de layout
- Hauteur uniforme sur les lignes (`h-14 align-middle`)

### Completion Notes

Tous les AC satisfaits. Tests unitaires (use cases) et fonctionnels (routes) ajoutas et verts. `pnpm run ci` passe.

### File List

- `app/domain/interfaces/import_activity_repository.ts` — ajout `setIgnored`, `setNew`
- `app/repositories/lucid_import_activity_repository.ts` — implementation
- `app/use_cases/import/ignore_activity.ts` — nouveau
- `app/use_cases/import/restore_activity.ts` — nouveau
- `app/controllers/import/import_activities_controller.ts` — nouveau
- `app/controllers/connectors/strava_connector_controller.ts` — prop `stravaConfigured`
- `start/routes.ts` — 2 nouvelles routes
- `inertia/pages/Connectors/Show.tsx` — alerte config manquante, boutons disabled
- `inertia/components/import/ActivitiesDataTable.tsx` — boutons ignore/restore, optimistic update, toggle, layout fixes
- `inertia/components/import/ActivityStatusBadge.tsx` — badge `importing`
- `resources/lang/fr/import.json` — cles ignore, restore, importing, showIgnored
- `resources/lang/en/import.json` — idem
- `tests/unit/use_cases/import/ignore_restore_activity.spec.ts` — nouveau
- `tests/functional/import/ignore_restore_activity.spec.ts` — nouveau
- `tests/unit/use_cases/import/import_activities.spec.ts` — stubs setIgnored/setNew
- `tests/unit/use_cases/import/list_pre_import_activities.spec.ts` — stubs setIgnored/setNew

### Change Log

- 2026-03-09 : Implementation story 8.6 — ignore/restore activites, optimistic update, toggle affichage
