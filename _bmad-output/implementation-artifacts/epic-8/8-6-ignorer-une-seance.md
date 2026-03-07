# Story 8.6 : Ignorer une seance

Status: draft

## Story

As a **utilisateur connecte**,
I want **ignorer une seance que je ne veux pas importer**,
so that **elle ne pollue plus ma liste de seances a traiter** (FR13).

## Acceptance Criteria

1. **Given** une activite est en statut `new` **When** je clique "Ignorer" **Then** le statut passe a `ignored`, badge gris "Ignoree", toast confirme
2. **Given** une activite est en statut `ignored` **When** je clique "Restaurer" **Then** le statut repasse a `new`, badge bleu "Nouvelle"
3. **Given** j'ai des activites ignorees **When** je regarde le tableau **Then** elles sont visibles mais visuellement distinctes (badge gris, opacite reduite)

## Tasks / Subtasks

- [ ] Task 1 : Route et controller ignore/restore (AC: #1, #2)
  - [ ] Route `POST /import/activities/:id/ignore`
  - [ ] Route `POST /import/activities/:id/restore`
- [ ] Task 2 : Use case IgnoreActivity / RestoreActivity (AC: #1, #2)
  - [ ] Mettre a jour le statut en base
- [ ] Task 3 : Frontend (AC: #1, #2, #3)
  - [ ] Bouton Ignorer (icone X) sur les lignes `new`
  - [ ] Bouton Restaurer (icone undo) sur les lignes `ignored`
  - [ ] Style visuel distinct pour les lignes ignorees (opacite reduite)

## Dev Notes

### UX

Les activites ignorees restent visibles pour permettre de les restaurer facilement. Elles sont visuellement distinctes mais pas cachees.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.6]
