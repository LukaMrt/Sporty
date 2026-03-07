# Story 8.5 : Import en lot avec progression

Status: draft

## Story

As a **utilisateur connecte**,
I want **selectionner plusieurs seances et les importer en lot avec un compteur de progression**,
so that **j'importe efficacement mes seances et je suis la progression** (FR11, FR12).

## Acceptance Criteria

1. **Given** j'ai des activites en statut `new` **When** je coche des checkboxes **Then** un compteur affiche le nombre selectionne et un bouton "Importer (N)" apparait
2. **Given** je clique "Importer (N)" **When** l'import demarre **Then** le backend traite sequentiellement : GET /activities/{id}, mapping, insert en transaction isolee, statut passe a `imported`
3. **Given** l'import est en cours **When** je reste sur la page **Then** un compteur de progression s'affiche via polling `GET /import/progress` toutes les 2-3 secondes
4. **Given** une activite echoue **When** l'erreur est detectee **Then** elle reste en `new`, les autres continuent, message final "4/5 importees, 1 en erreur"
5. **Given** l'import est termine **When** le dernier element est traite **Then** le tableau se rafraichit avec les badges mis a jour et un toast confirme

## Tasks / Subtasks

- [ ] Task 1 : Selection multiple frontend (AC: #1)
  - [ ] Checkboxes sur chaque ligne du DataTable
  - [ ] Compteur de selection + bouton "Importer (N)"
- [ ] Task 2 : Use case ImportActivities (AC: #2, #4)
  - [ ] Import sequentiel avec transaction isolee par activite
  - [ ] Appel GET /activities/{id} pour DetailedActivity
  - [ ] Mapping via StravaActivityMapper
  - [ ] Insert session + update import_activity status
  - [ ] Continue en cas d'erreur sur une activite
- [ ] Task 3 : Progression en memoire serveur (AC: #3)
  - [ ] Stocker progression dans un Map en memoire (user_id -> progress)
  - [ ] Route `GET /import/progress` pour polling frontend
- [ ] Task 4 : Route et controller import (AC: #2)
  - [ ] Route `POST /import/batch`
  - [ ] Accepter un tableau d'import_activity_ids
- [ ] Task 5 : Feedback frontend (AC: #3, #5)
  - [ ] Polling progression toutes les 2-3 secondes
  - [ ] Affichage "2/5 seances importees..."
  - [ ] Rafraichissement tableau a la fin
  - [ ] Toast de confirmation

## Dev Notes

### Import atomique

Chaque activite est importee dans sa propre transaction. Si une echoue, elle n'affecte pas les autres. Cela garantit la robustesse de l'import en lot.

### Progression en memoire

Pas besoin de Redis ou de WebSocket pour le MVP. Un simple Map en memoire avec polling HTTP suffit. Le frontend poll `GET /import/progress` et recoit `{ total: 5, completed: 2, failed: 0 }`.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.5]
