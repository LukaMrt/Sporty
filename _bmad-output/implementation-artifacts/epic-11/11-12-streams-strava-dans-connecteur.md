# Story 11.12 : Integration des Strava Streams dans le connecteur

Status: review

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

- [x] Task 1 : Appel API streams dans StravaConnector (AC: #1, #4, #5)
  - [x] Dans `getSessionDetail()`, apres l'appel detail, appeler `GET /activities/{id}/streams?keys=time,heartrate,latlng,altitude,velocity_smooth,distance,cadence`
  - [x] Conditionner au sport running : verifier via `sportSlug === 'running'` (equivalent a Run/TrailRun/VirtualRun)
  - [x] Wraper dans try/catch : si erreur, continuer sans streams
- [x] Task 2 : Conversion streams → trackpoints (AC: #1, #6)
  - [x] Creer `app/connectors/strava/strava_stream_converter.ts`
  - [x] Fonction `stravaStreamsToTrackpoints(streams): RawTrackpoint[]`
  - [x] Mapper chaque index : timeMs, lat/lon, ele, hr, cad, distanceCum
  - [x] Gerer les streams partiels : champs absents → `undefined`
- [x] Task 3 : Appeler TrackAnalyzer + services domaine (AC: #1, #2, #3)
  - [x] Passer les trackpoints au `TrackAnalyzer.analyze()`
  - [x] Si `context.maxHeartRate` et `heartRateCurve` presents : appeler `calculateZones()`, `calculateDrift()`, `calculateTrimp()`
  - [x] Merger tout dans `sportMetrics` du `MappedSessionData` retourne
- [x] Task 4 : Appliquer le lissage 30s sur velocity_smooth (AC: #1)
  - [x] `velocity_smooth` non utilise directement : le TrackAnalyzer calcule l'allure depuis GPS + distanceCum
  - [x] Le `TrackAnalyzer` applique deja le lissage 30s et le reechantillonnage 15s
- [x] Task 5 : Tests (AC: #1 a #7)
  - [x] Fixture JSON reelle fournie par Luka (`tests/fixtures/strava_streams.json`, 2211 points, ~6.2 km)
  - [x] Test : import running avec streams complets + contexte FC max → session complete avec zones
  - [x] Test : import running avec streams complets + sans contexte FC max → courbes sans zones
  - [x] Test : import running sans streams (erreur API) → session basique
  - [x] Test : import cycling → pas d'appel streams
  - [x] Test : streams partiels (sans heartrate) → pas de heartRateCurve, reste present
  - [x] Test : AC#7 couvert par architecture — `ImportSessions` et `SyncConnector` deleguent tous deux a `getSessionDetail()`, meme flux garanti

## Dev Notes

- **Format Strava Streams** : L'API retourne un **tableau** `[{type, data, series_type, ...}]` et non un dict. `indexStravaStreams()` convertit ce tableau en dict avant passage au converteur.
- **Rate limit** : +1 appel par activite running. Pour des imports unitaires, negligeable. Le `StravaHttpClient` gere deja le rate limiting et les retries.
- **Le `TrackAnalyzer`** (story 11.11) fait tout le travail lourd : lissage, reechantillonnage, splits, denivele. Le connecteur ne fait que convertir le format Strava en `RawTrackpoint[]` et appeler `analyze()`.
- **Services domaine appeles par le connecteur** : `calculateZones()`, `calculateDrift()`, `calculateTrimp()` de `heart_rate_zone_service.ts`. C'est autorise en Clean Architecture (infra → domaine).
- **Timestamps Strava** : `time.data` contient des secondes relatives (0, 1, 2, ...). Convertir en ms pour `RawTrackpoint.timeMs`.
- **velocity_smooth** : presente dans les streams Strava mais non utilisee directement — le TrackAnalyzer calcule l'allure depuis GPS + `distanceCum` avec lissage 30s integre.

## Dev Agent Record

### Implementation Plan

1. `strava_stream_converter.ts` : interface `RawStravaStream` (format tableau API), `StravaStreams` (dict normalise), `indexStravaStreams()`, `stravaStreamsToTrackpoints()`
2. `strava_connector.ts` : `getSessionDetail()` enrichi — appel streams conditionnel (running uniquement), try/catch, analyse TrackAnalyzer, merge sportMetrics, zones/drift/trimp si contexte FC max

### Completion Notes

- Nouveau fichier `app/connectors/strava/strava_stream_converter.ts` : converteur pur sans dependances framework
- `strava_connector.ts` : `getSessionDetail()` enrichi, `#toMappedSessionData()` refactore pour recevoir `sportSlug` en parametre (evite double appel au mapper)
- Fixture reelle Strava creee (`tests/fixtures/strava_streams.json`) depuis une vraie activite running (~6.2 km, 2211 points, 6 streams : time/latlng/altitude/heartrate/velocity_smooth/distance)
- 2 fichiers de tests : `strava_stream_converter.spec.ts` (tests unitaires purs du converteur) + `strava_connector.spec.ts` etendu (7 nouveaux groupes de tests streams)
- AC#7 couvert par architecture : les deux chemins d'import (`ImportSessions`, `SyncConnector`) deleguent a `Connector.getSessionDetail()` — un seul point d'implementation

## File List

- `app/connectors/strava/strava_stream_converter.ts` — nouveau
- `app/connectors/strava/strava_connector.ts` — modifie
- `tests/unit/connectors/strava/strava_stream_converter.spec.ts` — nouveau
- `tests/unit/connectors/strava/strava_connector.spec.ts` — modifie
- `tests/fixtures/strava_streams.json` — nouveau

## Change Log

- 2026-03-19 : Implémentation story 11.12 — intégration streams Strava dans le connecteur
