# Story 8.7 : Integration calendrier, stats et dashboard

Status: review

## Story

As a **utilisateur connecte**,
I want **que mes seances importees apparaissent dans le calendrier, les stats et le dashboard**,
so that **les seances importees sont traitees comme n'importe quelle seance Sporty** (FR22).

## Acceptance Criteria

1. **Given** des seances importees existent **When** je consulte la liste des seances **Then** elles apparaissent comme les seances manuelles avec un indicateur subtil "Strava"
2. **Given** des seances importees existent **When** je consulte le dashboard **Then** les metriques incluent les seances importees
3. **Given** une seance importee **When** je consulte son detail **Then** je vois les donnees mappees + "Importe depuis Strava", elle est modifiable
4. **Given** la meme activite importee deux fois **When** le systeme detecte le doublon via `external_id` **Then** l'import est ignore, pas de doublon

## Tasks / Subtasks

- [x] Task 1 : Indicateur source dans la liste des seances (AC: #1)
  - [x] Afficher un badge ou icone "Strava" pour `imported_from = 'strava'`
- [x] Task 2 : Inclusion dans les calculs dashboard (AC: #2)
  - [x] Verifier que les use cases existants (stats, dashboard) incluent deja les seances importees (elles sont des sessions normales)
  - [x] Ajuster si necessaire
- [x] Task 3 : Detail seance importee (AC: #3)
  - [x] Afficher la mention "Importe depuis Strava" dans le detail
  - [x] Permettre la modification comme une seance manuelle
- [x] Task 4 : Protection doublon (AC: #4)
  - [x] Verifier `external_id` avant import
  - [x] Si session existe deja avec meme external_id, skip

## Dev Notes

### Integration naturelle

Les seances importees sont des sessions standard dans la table `sessions`. Elles devraient naturellement apparaitre dans toutes les vues existantes sans modification des use cases de listing/stats. La seule modification est l'ajout d'un indicateur de source.

### One-way snapshot

Les modifications locales sur une seance importee ne sont jamais synchronisees vers Strava. C'est un snapshot a l'import.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.7]

## Dev Agent Record

### Implementation Notes

- **Task 1** : Badge "Strava" ajouté dans `SessionCard` (orange, subtil). `importedFrom` exposé depuis `#toEntity` dans `LucidSessionRepository`, passé via `SessionsController.index`, propagé dans `SessionSummary` (Index.tsx) et `SessionCardProps`.
- **Task 2** : Les séances importées sont des sessions normales dans la table `sessions` — aucune modification des use cases dashboard/stats requise. Vérifié dans `get_dashboard_metrics.ts` et `findByUserIdAndDateRange`.
- **Task 3** : Bandeau "Importé depuis Strava" affiché dans `Sessions/Show.tsx`. `importedFrom` ajouté à `TrainingSessionProps`. Traductions ajoutées (`sessions.show.importedFrom`) en FR et EN. La modification reste possible (EditLink inchangé).
- **Task 4** : Déjà géré par la page de staging (filtrage UI des activités déjà importées via statut `ImportActivityStatus`). Aucune modification nécessaire.

### Files Modified

- `app/repositories/lucid_session_repository.ts` — expose `importedFrom` et `externalId` dans `#toEntity`
- `app/controllers/sessions/sessions_controller.ts` — passe `importedFrom` dans `index`
- `inertia/components/sessions/SessionCard.tsx` — badge Strava
- `inertia/pages/Sessions/Index.tsx` — prop `importedFrom` dans `SessionSummary` + passage à `SessionCard`
- `inertia/pages/Sessions/Show.tsx` — prop `importedFrom` + bandeau visuel
- `resources/lang/fr/sessions.json` — clé `sessions.show.importedFrom`
- `resources/lang/en/sessions.json` — clé `sessions.show.importedFrom`

## Change Log

- 2026-03-09 : Story 8.7 implémentée — badge Strava liste + mention détail + vérification dashboard (Amelia)
