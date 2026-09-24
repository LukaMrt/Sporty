import { test } from '@japa/runner'
import {
  alignByDistance,
  maskPoints,
  routeSignature,
  sameRoute,
  trackPreview,
} from '#domain/services/analysis/route'
import { parseImportedPlan } from '#domain/services/plan_import_parser'
import { newRecords } from '#domain/services/analysis/report'
import type { GpsPoint } from '#domain/value_objects/run_metrics'

/** Boucle : aller vers le nord puis retour, `n` points de 10 m toutes les 3 s */
function loop(n: number, lonShift = 0): GpsPoint[] {
  const deg = 1 / 111_195
  const out: GpsPoint[] = []
  for (let i = 0; i < n; i++) {
    const k = i < n / 2 ? i : n - i
    out.push({ lat: 45 + k * 10 * deg, lon: 5 + lonShift, time: i * 3 })
  }
  return out
}

test.group('Parcours', () => {
  test('même parcours reconnu, parcours décalé rejeté', ({ assert }) => {
    const a = routeSignature(loop(200))!
    const b = routeSignature(loop(204))!
    const far = routeSignature(loop(200, 0.05))!
    assert.isTrue(sameRoute(a, b))
    assert.isFalse(sameRoute(a, far))
    assert.isNull(routeSignature(loop(5)))
  })

  test('alignement tous les 100 m : allure constante', ({ assert }) => {
    const points = alignByDistance(loop(200))
    assert.approximately(points[3].pace!, 300, 3)
    assert.equal(points[0].km, 0.1)
  })

  test('aperçu ≤ 201 points, masquage des zones', ({ assert }) => {
    const track = loop(1000)
    assert.isAtMost(trackPreview(track).length, 201)
    const masked = maskPoints(track, [{ lat: 45, lon: 5, radiusM: 100 }])
    assert.isBelow(masked.length, track.length)
    assert.isTrue(masked.every((p) => p.lat > 45 + 90 / 111_195))
  })
})

test.group('Plan importé', () => {
  test('liste Markdown : date, titre, durée, distance, notes', ({ assert }) => {
    const r = parseImportedPlan(
      '# Semaine 1\n- 2026-03-02 : Footing 45 min (Z2)\n- **04/03/2026** — Seuil 1h15 12,5 km'
    )
    assert.isTrue(r.ok)
    if (!r.ok) return
    assert.deepEqual(r.entries[0], {
      date: '2026-03-02',
      title: 'Footing 45 min',
      targetDurationMinutes: 45,
      targetDistanceKm: null,
      notes: 'Z2',
    })
    assert.equal(r.entries[1].date, '2026-03-04')
    assert.equal(r.entries[1].targetDurationMinutes, 75)
    assert.equal(r.entries[1].targetDistanceKm, 12.5)
  })

  test('JSON et erreurs', ({ assert }) => {
    const ok = parseImportedPlan('[{"date":"2026-03-02","title":"VMA","duration_minutes":50}]')
    assert.isTrue(ok.ok)
    assert.deepEqual(parseImportedPlan(''), { ok: false, error: 'empty' })
    assert.deepEqual(parseImportedPlan('[{"date":"demain"}]'), { ok: false, error: 'invalid_date' })
    assert.deepEqual(parseImportedPlan('pas de date ici'), { ok: false, error: 'no_entries' })
    assert.deepEqual(parseImportedPlan('[oops'), { ok: false, error: 'invalid_json' })
  })

  test('nouveaux records de la période', ({ assert }) => {
    const rec = (distance: 5000 | 10000, seconds: number) => ({
      distance,
      seconds,
      sessionId: 1,
      date: '',
    })
    assert.deepEqual(
      newRecords([rec(5000, 1190), rec(10000, 2500)], [rec(5000, 1200), rec(10000, 2400)]).map(
        (r) => r.distance
      ),
      [5000]
    )
  })
})
