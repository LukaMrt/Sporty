# Story 11.6 : Upload et import GPX sur une seance

Status: pending

## Story

As a **utilisateur connecte**,
I want **importer un fichier GPX lors de la creation d'une seance ou sur une seance existante**,
so that **ma seance est automatiquement enrichie avec toutes les donnees du fichier**.

## Acceptance Criteria

1. **Given** je cree une nouvelle seance **When** je clique sur "Importer un GPX" dans le formulaire **Then** un selecteur de fichier s'ouvre (accept: `.gpx`)
2. **Given** je selectionne un fichier GPX valide **When** le fichier est uploade et parse **Then** les champs du formulaire sont pre-remplis : sport (course), date, duree, distance, FC moy, FC min, FC max, cadence, denivele **And** un apercu de la carte s'affiche dans le formulaire **And** je peux corriger les valeurs avant de sauvegarder
3. **Given** je sauvegarde la seance importee depuis un GPX **When** la requete est traitee **Then** le fichier GPX est stocke dans `storage/gpx/{userId}/{sessionId}.gpx` **And** les `sportMetrics` contiennent les courbes, splits et metriques calculees au format `RunMetrics` **And** `gpxFilePath` est renseigne en base
4. **Given** je suis sur le detail d'une seance existante sans GPX **When** je clique sur "Enrichir avec un GPX" **Then** le meme flow d'upload se declenche **And** les donnees GPX sont mergees avec les donnees existantes (GPX ecrase les valeurs manuelles sauf ressenti et notes)
5. **Given** je selectionne un fichier GPX invalide **When** l'upload echoue **Then** un message d'erreur clair s'affiche ("Format GPX invalide")

## Tasks / Subtasks

- [ ] Task 1 : Backend — route et controller upload (AC: #1, #5)
  - [ ] Route POST `/sessions/parse-gpx` pour parser un GPX sans creer de seance (retourne les donnees extraites)
  - [ ] Route POST `/sessions/:id/enrich-gpx` pour enrichir une seance existante (AC #4)
  - [ ] Validation : fichier `.gpx`, taille max 10 Mo
  - [ ] Retourner les donnees parsees au frontend pour pre-remplissage
- [ ] Task 2 : Backend — stockage fichier GPX (AC: #3)
  - [ ] Utiliser AdonisJS Drive pour stocker le fichier dans `storage/gpx/{userId}/{sessionId}.gpx`
  - [ ] Sauvegarder `gpxFilePath` en base apres creation/enrichissement de la seance
  - [ ] Ne stocker que pour les imports manuels (pas pour les imports Strava)
- [ ] Task 3 : Backend — use case creation avec GPX (AC: #2, #3)
  - [ ] Etendre le use case de creation de seance pour accepter des `RunMetrics` completes depuis le parsing GPX
  - [ ] Merger les valeurs GPX avec les valeurs saisies par l'utilisateur
- [ ] Task 4 : Backend — use case enrichissement retroactif (AC: #4)
  - [ ] Creer use case `EnrichSessionWithGpx` dans `app/use_cases/sessions/`
  - [ ] Charger la seance existante, parser le GPX, merger les donnees
  - [ ] Regle de merge : GPX ecrase tout sauf `perceivedEffort` et `notes`
- [ ] Task 5 : Frontend — bouton "Importer un GPX" dans SessionForm (AC: #1, #2)
  - [ ] Input file hidden + bouton stylise, accept `.gpx`
  - [ ] Au changement : upload vers `/sessions/parse-gpx`
  - [ ] Pre-remplir les champs du formulaire avec les donnees retournees
  - [ ] Afficher un apercu de la carte (mini-carte Leaflet avec le trace)
  - [ ] Indicateur de chargement pendant le parsing
- [ ] Task 6 : Frontend — bouton "Enrichir avec un GPX" sur le detail (AC: #4)
  - [ ] Bouton visible uniquement si la seance n'a pas de GPX
  - [ ] Meme flow d'upload, puis rafraichir la page au succes
- [ ] Task 7 : Frontend — gestion erreurs (AC: #5)
  - [ ] Afficher un toast d'erreur si le GPX est invalide
  - [ ] Afficher un toast d'erreur si le fichier est trop gros (> 10 Mo)

## Dev Notes

### Flow d'upload

1. L'utilisateur selectionne un fichier GPX
2. Le fichier est envoye au backend via `POST /sessions/parse-gpx` (multipart)
3. Le backend parse le GPX avec `GpxParserService` (Story 11.5)
4. Les donnees extraites sont retournees au frontend en JSON
5. Le frontend pre-remplit le formulaire + affiche l'apercu carte
6. L'utilisateur corrige si besoin et sauvegarde
7. A la sauvegarde, le fichier GPX est stocke sur disque et le chemin enregistre en base

### Stockage

Le fichier GPX brut est conserve pour permettre un re-parsing futur (si on affine les algorithmes). Stockage via AdonisJS Drive (local filesystem en self-hosted).

### Merge GPX sur seance existante

| Champ | Regle |
|-------|-------|
| duration, distance, avgHeartRate | GPX ecrase |
| FC min/max, cadence, denivele | GPX ecrase |
| Courbes, splits, GPS track | GPX ajoute |
| perceivedEffort | Conserve la valeur manuelle |
| notes | Conserve la valeur manuelle |
| date | Conserve la valeur existante (l'utilisateur peut l'avoir corrigee) |

### Dependances

- Story 11.5 (GpxParserService)
- Story 11.3 (schema RunMetrics, colonne gpxFilePath)

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.6]
- AdonisJS Drive : https://docs.adonisjs.com/guides/digging-deeper/drive
