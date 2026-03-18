# Story 11.12 : Integration des Strava Streams dans le connecteur

Status: todo

Prerequis: 11.11, 11-refacto

## Story

As a **utilisateur qui importe depuis Strava**,
I want **que lorsque je clique "Importer", la session soit creee avec toutes les donnees riches (courbes FC/allure/altitude, carte GPS, splits km, zones FC, drift, TRIMP)**,
so that **je n'ai aucune action supplementaire a faire pour avoir une session complete**.

## Acceptance Criteria

1. **Given** j'importe une activite running Strava avec streams disponibles **When** l'import se termine **Then** la session creee contient dans `sportMetrics` : `heartRateCurve`, `paceCurve`, `altitudeCurve`, `gpsTrack`, `splits`, `minHeartRate`, `maxHeartRate`, `cadenceAvg`, `elevationGain`, `elevationLoss`
2. **Given** j'importe une activite running **And** mon profil a une FC max configuree **When** le `MappingContext` est passe au connecteur **Then** `sportMetrics` contient aussi `hrZones`, `cardiacDrift`, `trimp`
3. **Given** j'importe une activite running **And** mon profil n'a pas de FC max **When** le contexte est vide **Then** les courbes et splits sont presents, mais `hrZones`, `cardiacDrift`, `trimp` sont absents
4. **Given** j'importe une activite running sans streams (activite manuelle Strava, erreur API) **When** l'import se termine **Then** la session est creee avec les metriques basiques sans courbes ni splits (graceful degradation)
5. **Given** j'importe une activite non-running (velo, natation) **When** l'import se termine **Then** les streams ne sont pas recuperes, la session est creee comme aujourd'hui
6. **Given** les streams sont partiels (pas de heartrate, ou pas de latlng) **When** le connecteur traite **Then** seules les courbes disponibles sont produites, les autres sont `undefined`
7. **Given** l'import via `ImportSessions` ou l'auto-import via `SyncConnector` **When** une activite running est importee **Then** le resultat est identique (meme flux, meme enrichissement)

## Tasks / Subtasks

- [ ] Task 1 : Appel API streams dans StravaConnector (AC: #1, #4, #5)
  - [ ] Dans `getSessionDetail()`, apres l'appel detail, appeler `GET /activities/{id}/streams?keys=time,heartrate,latlng,altitude,velocity_smooth,distance,cadence`
  - [ ] Conditionner au sport running : verifier `sport_type` in (`Run`, `TrailRun`, `VirtualRun`)
  - [ ] Wraper dans try/catch : si erreur, continuer sans streams
- [ ] Task 2 : Conversion streams → trackpoints (AC: #1, #6)
  - [ ] Creer `app/connectors/strava/strava_stream_converter.ts`
  - [ ] Fonction `stravaStreamsToTrackpoints(streams): RawTrackpoint[]`
  - [ ] Mapper chaque index : timeMs, lat/lon, ele, hr, cad, distanceCum
  - [ ] Gerer les streams partiels : champs absents → `undefined`
- [ ] Task 3 : Appeler TrackAnalyzer + services domaine (AC: #1, #2, #3)
  - [ ] Passer les trackpoints au `TrackAnalyzer.analyze()`
  - [ ] Si `context.maxHeartRate` et `heartRateCurve` presents : appeler `calculateZones()`, `calculateDrift()`, `calculateTrimp()`
  - [ ] Merger tout dans `sportMetrics` du `MappedSessionData` retourne
- [ ] Task 4 : Appliquer le lissage 30s sur velocity_smooth (AC: #1)
  - [ ] Convertir `velocity_smooth` (m/s) en allure (s/km) : `1000 / vitesse`
  - [ ] Le `TrackAnalyzer` applique deja le lissage 30s et le reechantillonnage 15s
- [ ] Task 5 : Tests (AC: #1 a #7)
  - [ ] Fixture JSON reelle fournie par Luka (reponse streams Strava)
  - [ ] Test : import running avec streams complets + contexte FC max → session complete avec zones
  - [ ] Test : import running avec streams complets + sans contexte FC max → courbes sans zones
  - [ ] Test : import running sans streams (erreur API) → session basique
  - [ ] Test : import cycling → pas d'appel streams
  - [ ] Test : streams partiels (sans heartrate) → pas de heartRateCurve, reste present
  - [ ] Test : verifier que `ImportSessions` et `SyncConnector` produisent le meme resultat

## Dev Notes

- **Format Strava Streams** : `{ "time": { "data": [0,1,2,...] }, "heartrate": { "data": [120,122,...] } }`. Toutes les series `data` ont la meme longueur, synchronisees par index.
- **Rate limit** : +1 appel par activite running. Pour des imports unitaires, negligeable. Le `StravaHttpClient` gere deja le rate limiting et les retries.
- **Le `TrackAnalyzer`** (story 11.11) fait tout le travail lourd : lissage, reechantillonnage, splits, denivele. Le connecteur ne fait que convertir le format Strava en `RawTrackpoint[]` et appeler `analyze()`.
- **Services domaine appeles par le connecteur** : `calculateZones()`, `calculateDrift()`, `calculateTrimp()` de `heart_rate_zone_service.ts`. C'est autorise en Clean Architecture (infra → domaine).
- **Timestamps Strava** : `time.data` contient des secondes relatives (0, 1, 2, ...). Convertir en ms pour `RawTrackpoint.timeMs`.
