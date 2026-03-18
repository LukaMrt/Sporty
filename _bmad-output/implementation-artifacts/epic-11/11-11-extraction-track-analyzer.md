# Story 11.11 : Extraction du TrackAnalyzer depuis GpxParserService

Status: todo

## Story

As a **developpeur**,
I want **extraire la logique de traitement de traces (reechantillonnage, lissage, splits, denivele, stats FC) dans un service generique `TrackAnalyzer`**,
so that **le meme pipeline de calcul soit reutilisable par le parser GPX et le connecteur Strava sans duplication**.

## Acceptance Criteria

1. **Given** le fichier `app/lib/track_analyzer.ts` existe **When** il est appele avec un tableau de `RawTrackpoint[]` **Then** il retourne un `TrackAnalysisResult` contenant : `heartRateCurve`, `paceCurve`, `altitudeCurve`, `gpsTrack` (reechantillonnes 15s), `splits` (KmSplit[]), `minHeartRate`, `maxHeartRate`, `avgHeartRate`, `cadenceAvg`, `elevationGain`, `elevationLoss`, `durationSeconds`, `distanceMeters`
2. **Given** `GpxParserService` est refactore **When** les tests existants du parser GPX tournent **Then** ils passent tous sans modification
3. **Given** un `RawTrackpoint[]` avec distance cumulee fournie (champ optionnel `distanceCum`) **When** le `TrackAnalyzer` calcule la distance et les splits **Then** il utilise `distanceCum` au lieu de Haversine
4. **Given** des trackpoints sans heartrate / sans altitude / sans cadence **When** le `TrackAnalyzer` traite **Then** les courbes et metriques correspondantes sont `undefined`

## Tasks / Subtasks

- [ ] Task 1 : Creer TrackAnalyzer (AC: #1, #3, #4)
  - [ ] Creer `app/lib/track_analyzer.ts`
  - [ ] Exporter `RawTrackpoint` (lat, lon, timeMs, ele?, hr?, cad?, distanceCum?)
  - [ ] Exporter `TrackAnalysisResult` (meme shape que `GpxParseResult`)
  - [ ] Deplacer depuis `GpxParserService` : `computeRawPace`, `smoothPace`, `buildTimeSamples`, `resampleValues`, `resampleGps`, `computeElevation`, `computeSplits`, `haversine`, `computeTotalDistance`
  - [ ] Si `distanceCum` est present sur les trackpoints, utiliser la distance cumulee au lieu de Haversine pour la distance totale et les splits
  - [ ] Fonction principale `analyze(points: RawTrackpoint[]): TrackAnalysisResult`
- [ ] Task 2 : Refactorer GpxParserService (AC: #2)
  - [ ] Ne garder que `parse(content: string)` : parsing XML → `RawTrackpoint[]`
  - [ ] Appeler `analyze(points)` pour le traitement
  - [ ] Verifier que tous les tests GPX existants passent sans modification
- [ ] Task 3 : Tests unitaires TrackAnalyzer (AC: #1, #3, #4)
  - [ ] Test avec trackpoints complets (tous les champs)
  - [ ] Test avec trackpoints partiels (sans HR, sans altitude, sans cadence)
  - [ ] Test avec `distanceCum` fourni : pas de Haversine, splits corrects
  - [ ] Test reechantillonnage 15s : nombre de points coherent

## Dev Notes

- `RawTrackpoint` existe deja en interface privee dans `GpxParserService`. On la rend publique et on ajoute `distanceCum?: number`.
- `TrackAnalysisResult` est identique a `GpxParseResult`. On peut remplacer `GpxParseResult` par un re-export de `TrackAnalysisResult` pour ne pas casser le port `GpxParser`.
- Le `computeSplits` actuel utilise Haversine pour accumuler la distance. Avec `distanceCum`, on lit directement — plus simple et plus precis.
