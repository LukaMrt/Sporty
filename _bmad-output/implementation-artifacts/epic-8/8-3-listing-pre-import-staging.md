# Story 8.3 : Listing pre-import & staging

Status: draft

## Story

As a **utilisateur avec un connecteur Strava connecte**,
I want **voir la liste de mes seances Strava disponibles a l'import**,
so that **je peux choisir lesquelles importer** (FR7, FR29).

## Acceptance Criteria

1. **Given** mon connecteur est en etat `connected` **When** j'accede a la page Import **Then** le systeme appelle `GET /athlete/activities` via StravaHttpClient avec `per_page=200` et `after` = 1 mois par defaut
2. **Given** les activites sont recuperees **When** elles sont traitees **Then** elles sont sauvegardees dans `import_activities` avec status `new` et `raw_data` = SummaryActivity brute, deduplication via contrainte unique
3. **Given** des activites existent deja en staging **When** la page se charge **Then** les activites deja importees ou ignorees conservent leur statut
4. **Given** le connecteur est en etat `error` ou `disconnected` **When** j'accede a la page Import **Then** un message m'invite a (re)connecter Strava, pas d'appel API
5. **Given** les performances **When** le listing se charge **Then** il repond en moins de 5 secondes pour 1 mois de donnees

## Tasks / Subtasks

- [ ] Task 1 : Use case ListPreImportActivities (AC: #1, #2, #3)
  - [ ] Verifier etat connecteur
  - [ ] Appeler l'API Strava via StravaHttpClient
  - [ ] Sauvegarder les nouvelles activites en staging (upsert)
  - [ ] Retourner la liste complete avec statuts
- [ ] Task 2 : Route et controller (AC: #1, #4)
  - [ ] Route `GET /import` ou `GET /import/activities`
  - [ ] Gestion des cas erreur/disconnected
- [ ] Task 3 : Plage temporelle par defaut (AC: #1)
  - [ ] Defaut : 1 mois en arriere
  - [ ] Parametrable via query params (date_from, date_to)

## Dev Notes

### API Strava endpoint

```
GET https://www.strava.com/api/v3/athlete/activities?per_page=200&after={timestamp}
```

`after` est un epoch timestamp. Pour 1 mois par defaut : `Date.now() / 1000 - 30 * 24 * 3600`.

### Deduplication

La contrainte unique `(connector_id, external_id)` empeche les doublons. Utiliser un upsert ou un INSERT ... ON CONFLICT DO NOTHING.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 8.3]
