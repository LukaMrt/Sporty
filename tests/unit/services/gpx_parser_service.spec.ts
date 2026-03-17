import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { GpxParserService } from '#services/gpx_parser_service'
import { GpxParseError } from '#domain/errors/gpx_parse_error'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const GPX_FIXTURE_NO_HR = readFileSync(join(CURRENT_DIR, 'fixtures/gpx_fixture.gpx'), 'utf-8')

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** GPX complet : 4 points, ~1km, FC + cadence + elevation */
const GPX_FULL = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <trkseg>
      <trkpt lat="48.8566" lon="2.3522">
        <ele>35.0</ele>
        <time>2026-03-16T08:30:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>142</gpxtpx:hr>
            <gpxtpx:cad>88</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="48.8575" lon="2.3540">
        <ele>38.0</ele>
        <time>2026-03-16T08:31:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>150</gpxtpx:hr>
            <gpxtpx:cad>90</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="48.8584" lon="2.3558">
        <ele>36.0</ele>
        <time>2026-03-16T08:32:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>155</gpxtpx:hr>
            <gpxtpx:cad>92</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="48.8593" lon="2.3576">
        <ele>34.0</ele>
        <time>2026-03-16T08:33:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>148</gpxtpx:hr>
            <gpxtpx:cad>89</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`

/** GPX minimal : lat/lon/time uniquement, pas d'extensions */
const GPX_MINIMAL = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="48.8566" lon="2.3522">
        <time>2026-03-16T08:30:00Z</time>
      </trkpt>
      <trkpt lat="48.8575" lon="2.3540">
        <time>2026-03-16T08:31:00Z</time>
      </trkpt>
      <trkpt lat="48.8584" lon="2.3558">
        <time>2026-03-16T08:32:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`

/** GPX invalide (XML malformé) */
const GPX_INVALID = `<gpx><trk><trkseg><trkpt lat="48.8566"`

/** GPX sans trackpoints */
const GPX_NO_TRKPT = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
    </trkseg>
  </trk>
</gpx>`

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('GpxParserService', () => {
  const parser = new GpxParserService()

  test('parse GPX complet — durée et distance correctes', ({ assert }) => {
    const result = parser.parse(GPX_FULL)

    // Durée : 3 minutes = 180s
    assert.equal(result.durationSeconds, 180)

    // Distance : ~4 segments de ~160m chacun ≈ ~490m (3 sauts de ~163m)
    // On vérifie juste que c'est > 0 et raisonnable
    assert.isAbove(result.distanceMeters, 300)
    assert.isBelow(result.distanceMeters, 700)
  })

  test('parse GPX complet — FC min/moy/max correctes', ({ assert }) => {
    const result = parser.parse(GPX_FULL)

    assert.equal(result.minHeartRate, 142)
    assert.equal(result.maxHeartRate, 155)
    // Moyenne de 142, 150, 155, 148 = 148.75 → arrondi 149
    assert.equal(result.avgHeartRate, 149)
  })

  test('parse GPX complet — cadence moyenne correcte', ({ assert }) => {
    const result = parser.parse(GPX_FULL)

    // Moyenne de 88, 90, 92, 89 = 89.75 → arrondi 90
    assert.equal(result.cadenceAvg, 90)
  })

  test('parse GPX complet — courbes présentes', ({ assert }) => {
    const result = parser.parse(GPX_FULL)

    assert.exists(result.heartRateCurve)
    assert.isAbove(result.heartRateCurve!.length, 0)
    assert.exists(result.paceCurve)
    assert.isAbove(result.paceCurve!.length, 0)
    assert.exists(result.altitudeCurve)
    assert.isAbove(result.altitudeCurve!.length, 0)
    assert.exists(result.gpsTrack)
    assert.isAbove(result.gpsTrack!.length, 0)
  })

  test('parse GPX complet — structure DataPoint correcte', ({ assert }) => {
    const result = parser.parse(GPX_FULL)

    const firstPoint = result.heartRateCurve![0]
    assert.equal(firstPoint.time, 0)
    assert.isAbove(firstPoint.value, 0)
  })

  test('parse GPX complet — dénivelé positif et négatif', ({ assert }) => {
    const result = parser.parse(GPX_FULL)

    // Deltas: +3, -2, -2 — seuil bruit 2m → seul +3 compte
    assert.equal(result.elevationGain, 3)
    // -2 et -2 n'excèdent pas le seuil strict (> 2m) → 0
    assert.equal(result.elevationLoss, 0)
  })

  test('parse GPX sans extensions FC — courbes FC et cadence absentes', ({ assert }) => {
    const result = parser.parse(GPX_MINIMAL)

    assert.isUndefined(result.heartRateCurve)
    assert.isUndefined(result.cadenceAvg)
    assert.isUndefined(result.minHeartRate)
    assert.isUndefined(result.maxHeartRate)
    assert.isUndefined(result.avgHeartRate)
  })

  test('parse GPX sans extensions FC — données GPS et distance présentes', ({ assert }) => {
    const result = parser.parse(GPX_MINIMAL)

    assert.isAbove(result.distanceMeters, 0)
    assert.equal(result.durationSeconds, 120)
    assert.exists(result.gpsTrack)
    assert.exists(result.paceCurve)
  })

  test('parse GPX invalide — lève GpxParseError', ({ assert }) => {
    assert.throws(() => parser.parse(GPX_INVALID), GpxParseError)
  })

  test('parse GPX sans trackpoints — lève GpxParseError avec message explicite', ({ assert }) => {
    assert.throws(() => parser.parse(GPX_NO_TRKPT), GpxParseError, 'Aucun trackpoint trouvé')
  })

  test('parse chaîne vide — lève GpxParseError', ({ assert }) => {
    assert.throws(() => parser.parse(''), GpxParseError)
  })

  test('parse GPX complet — splits au km présents', ({ assert }) => {
    const result = parser.parse(GPX_FULL)

    // Distance ~490m : pas de split complet au km
    assert.exists(result.splits)
    assert.isArray(result.splits)
  })

  // ── Tests avec le fichier GPX réel Apple Watch (sans FC) ─────────────────

  test('fixture réelle — durée correcte (290s)', ({ assert }) => {
    const result = parser.parse(GPX_FIXTURE_NO_HR)
    assert.equal(result.durationSeconds, 290)
  })

  test('fixture réelle — distance > 0 et cohérente', ({ assert }) => {
    const result = parser.parse(GPX_FIXTURE_NO_HR)
    // Course de ~5 minutes : distance raisonnable entre 500m et 2000m
    assert.isAbove(result.distanceMeters, 500)
    assert.isBelow(result.distanceMeters, 2000)
  })

  test('fixture réelle — pas de FC ni cadence (AC#2)', ({ assert }) => {
    const result = parser.parse(GPX_FIXTURE_NO_HR)
    assert.isUndefined(result.heartRateCurve)
    assert.isUndefined(result.cadenceAvg)
    assert.isUndefined(result.minHeartRate)
    assert.isUndefined(result.maxHeartRate)
  })

  test('fixture réelle — tracé GPS et allure présents', ({ assert }) => {
    const result = parser.parse(GPX_FIXTURE_NO_HR)
    assert.exists(result.gpsTrack)
    assert.isAbove(result.gpsTrack!.length, 0)
    assert.exists(result.paceCurve)
    assert.isAbove(result.paceCurve!.length, 0)
  })

  test('fixture réelle — dénivelé calculé (elevation présente)', ({ assert }) => {
    const result = parser.parse(GPX_FIXTURE_NO_HR)
    // elevationGain peut être 0 si tous les deltas sont sous le seuil de bruit (2m)
    assert.isDefined(result.elevationGain)
    assert.isDefined(result.elevationLoss)
    assert.isAtLeast(result.elevationGain!, 0)
  })

  test('fixture réelle — courbes rééchantillonnées toutes les 15s', ({ assert }) => {
    const result = parser.parse(GPX_FIXTURE_NO_HR)
    // 290s / 15s ≈ 20 points
    const expectedPoints = Math.floor(290 / 15) + 1
    assert.closeTo(result.paceCurve!.length, expectedPoints, 2)
  })
})
