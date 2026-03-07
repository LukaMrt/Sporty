# Story 8.7 : Integration calendrier, stats et dashboard

Status: draft

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

- [ ] Task 1 : Indicateur source dans la liste des seances (AC: #1)
  - [ ] Afficher un badge ou icone "Strava" pour `imported_from = 'strava'`
- [ ] Task 2 : Inclusion dans les calculs dashboard (AC: #2)
  - [ ] Verifier que les use cases existants (stats, dashboard) incluent deja les seances importees (elles sont des sessions normales)
  - [ ] Ajuster si necessaire
- [ ] Task 3 : Detail seance importee (AC: #3)
  - [ ] Afficher la mention "Importe depuis Strava" dans le detail
  - [ ] Permettre la modification comme une seance manuelle
- [ ] Task 4 : Protection doublon (AC: #4)
  - [ ] Verifier `external_id` avant import
  - [ ] Si session existe deja avec meme external_id, skip

## Dev Notes

### Integration naturelle

Les seances importees sont des sessions standard dans la table `sessions`. Elles devraient naturellement apparaitre dans toutes les vues existantes sans modification des use cases de listing/stats. La seule modification est l'ajout d'un indicateur de source.

### One-way snapshot

Les modifications locales sur une seance importee ne sont jamais synchronisees vers Strava. C'est un snapshot a l'import.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.7]
