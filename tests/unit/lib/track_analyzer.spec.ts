import { test } from '@japa/runner'
import { analyze, type RawTrackpoint } from '#lib/track_analyzer'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 4 trackpoints couvrant ~490m, 3 minutes, avec FC + cadence + altitude */
function makeFullPoints(): RawTrackpoint[] {
  return [
    { lat: 48.8566, lon: 2.3522, timeMs: 0, ele: 35, hr: 142, cad: 88 },
    { lat: 48.8575, lon: 2.354, timeMs: 60_000, ele: 38, hr: 150, cad: 90 },
    { lat: 48.8584, lon: 2.3558, timeMs: 120_000, ele: 36, hr: 155, cad: 92 },
    { lat: 48.8593, lon: 2.3576, timeMs: 180_000, ele: 34, hr: 148, cad: 89 },
  ]
}

/** 3 trackpoints sans FC, cadence, ni altitude */
function makeMinimalPoints(): RawTrackpoint[] {
  return [
    { lat: 48.8566, lon: 2.3522, timeMs: 0 },
    { lat: 48.8575, lon: 2.354, timeMs: 60_000 },
    { lat: 48.8584, lon: 2.3558, timeMs: 120_000 },
  ]
}

/** Points avec distanceCum fournie (distance exacte connue) */
function makeDistanceCumPoints(): RawTrackpoint[] {
  // 5 points répartis sur 5km avec distance précalculée
  const base = 1_000_000 // 2026-01-01 00:00:00 UTC
  return [
    { lat: 48.0, lon: 2.0, timeMs: base, distanceCum: 0 },
    { lat: 48.001, lon: 2.0, timeMs: base + 300_000, distanceCum: 1000 },
    { lat: 48.002, lon: 2.0, timeMs: base + 600_000, distanceCum: 2000 },
    { lat: 48.003, lon: 2.0, timeMs: base + 900_000, distanceCum: 3000 },
    { lat: 48.004, lon: 2.0, timeMs: base + 1_200_000, distanceCum: 4000 },
    { lat: 48.005, lon: 2.0, timeMs: base + 1_500_000, distanceCum: 5000 },
  ]
}

// ── Tests : trackpoints complets ──────────────────────────────────────────────

test.group('TrackAnalyzer — trackpoints complets', () => {
  test('durée et distance calculées correctement', ({ assert }) => {
    const result = analyze(makeFullPoints())

    assert.equal(result.durationSeconds, 180)
    assert.isAbove(result.distanceMeters, 300)
    assert.isBelow(result.distanceMeters, 700)
  })

  test('FC min/moy/max correctes', ({ assert }) => {
    const result = analyze(makeFullPoints())

    assert.equal(result.minHeartRate, 142)
    assert.equal(result.maxHeartRate, 155)
    // Moyenne de 142, 150, 155, 148 = 148.75 → arrondi 149
    assert.equal(result.avgHeartRate, 149)
  })

  test('cadence moyenne correcte', ({ assert }) => {
    const result = analyze(makeFullPoints())
    // Moyenne de 88, 90, 92, 89 = 89.75 → arrondi 90
    assert.equal(result.cadenceAvg, 90)
  })

  test('toutes les courbes présentes', ({ assert }) => {
    const result = analyze(makeFullPoints())

    assert.exists(result.heartRateCurve)
    assert.isAbove(result.heartRateCurve!.length, 0)
    assert.exists(result.paceCurve)
    assert.isAbove(result.paceCurve!.length, 0)
    assert.exists(result.altitudeCurve)
    assert.isAbove(result.altitudeCurve!.length, 0)
    assert.exists(result.gpsTrack)
    assert.isAbove(result.gpsTrack!.length, 0)
  })

  test('dénivelé correct (seuil bruit 2m)', ({ assert }) => {
    const result = analyze(makeFullPoints())

    // Deltas: +3, -2, -2 — seuil strict > 2m → seul +3 compte pour gain
    assert.equal(result.elevationGain, 3)
    assert.equal(result.elevationLoss, 0)
  })

  test('rééchantillonnage 15s — nombre de points cohérent', ({ assert }) => {
    const result = analyze(makeFullPoints())

    // 180s / 15s + 1 = 13 points
    const expectedPoints = Math.floor(180 / 15) + 1
    assert.closeTo(result.paceCurve!.length, expectedPoints, 2)
  })

  test('splits présents (distance < 1km → seulement partiel)', ({ assert }) => {
    const result = analyze(makeFullPoints())

    assert.isArray(result.splits)
    // ~490m total : pas de split complet, seulement un partiel éventuel
    if (result.splits!.length > 0) {
      assert.isTrue(result.splits![0].partial)
    }
  })
})

// ── Tests : trackpoints partiels ─────────────────────────────────────────────

test.group('TrackAnalyzer — trackpoints sans FC/altitude/cadence', () => {
  test('FC undefined quand absent', ({ assert }) => {
    const result = analyze(makeMinimalPoints())

    assert.isUndefined(result.heartRateCurve)
    assert.isUndefined(result.minHeartRate)
    assert.isUndefined(result.maxHeartRate)
    assert.isUndefined(result.avgHeartRate)
  })

  test('cadence undefined quand absente', ({ assert }) => {
    const result = analyze(makeMinimalPoints())
    assert.isUndefined(result.cadenceAvg)
  })

  test('altitude undefined quand absente', ({ assert }) => {
    const result = analyze(makeMinimalPoints())
    assert.isUndefined(result.altitudeCurve)
    assert.isUndefined(result.elevationGain)
    assert.isUndefined(result.elevationLoss)
  })

  test('distance et tracé GPS toujours présents', ({ assert }) => {
    const result = analyze(makeMinimalPoints())

    assert.isAbove(result.distanceMeters, 0)
    assert.equal(result.durationSeconds, 120)
    assert.exists(result.gpsTrack)
    assert.exists(result.paceCurve)
  })
})

// ── Tests : distanceCum fournie ───────────────────────────────────────────────

test.group('TrackAnalyzer — distanceCum fournie', () => {
  test('distance totale prise depuis distanceCum (pas Haversine)', ({ assert }) => {
    const points = makeDistanceCumPoints()
    const result = analyze(points)

    // distanceCum sur dernier point = 5000m
    assert.equal(result.distanceMeters, 5000)
  })

  test('splits corrects avec distanceCum — 5 splits complets', ({ assert }) => {
    const points = makeDistanceCumPoints()
    const result = analyze(points)

    assert.isArray(result.splits)
    // 5km → 5 splits complets (km 1 à 5), pas de partiel
    const completeSplits = result.splits!.filter((s) => !s.partial)
    assert.equal(completeSplits.length, 5)
  })

  test('allure du split cohérente avec distanceCum', ({ assert }) => {
    const points = makeDistanceCumPoints()
    const result = analyze(points)

    // Chaque km prend 300s → allure = 300 s/km
    const firstSplit = result.splits![0]
    assert.closeTo(firstSplit.paceSeconds, 300, 5)
  })
})
