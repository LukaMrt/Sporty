import { test } from '@japa/runner'
import {
  calculateVdot,
  derivePaceZones,
  vdotFromVma,
  vdotFromQuestionnaire,
  vdotFromHistory,
} from '#domain/services/vdot_calculator'
import type { RunSession } from '#domain/services/vdot_calculator'

// ── calculateVdot ─────────────────────────────────────────────────────────────

test.group('calculateVdot — formules Daniels-Gilbert', () => {
  test('5K en 20:00 → VDOT ~49.8 (formule Daniels-Gilbert)', ({ assert }) => {
    const vdot = calculateVdot(5000, 20)
    assert.approximately(vdot, 49.8, 0.5)
  })

  test('5K en 25:00 → VDOT plus bas (~42)', ({ assert }) => {
    const vdot = calculateVdot(5000, 25)
    assert.isBelow(vdot, 45)
    assert.isAbove(vdot, 38)
  })

  test('10K en 40:00 → VDOT ~51.9', ({ assert }) => {
    const vdot = calculateVdot(10000, 40)
    assert.approximately(vdot, 51.9, 0.5)
  })

  test('marathon en 3h30 → VDOT ~44.5', ({ assert }) => {
    const vdot = calculateVdot(42195, 210)
    assert.approximately(vdot, 44.5, 0.5)
  })

  test("VDOT croît quand la performance s'améliore (même distance)", ({ assert }) => {
    const slow = calculateVdot(5000, 30)
    const fast = calculateVdot(5000, 20)
    assert.isAbove(fast, slow)
  })
})

// ── derivePaceZones ───────────────────────────────────────────────────────────

test.group('derivePaceZones — 5 zones depuis VDOT 44.7', () => {
  const zones = derivePaceZones(44.7)

  test('zones ordonnées par intensité croissante', ({ assert }) => {
    // Zone R est plus rapide que zone I, qui est plus rapide que T, etc.
    assert.isBelow(zones.repetition.minPacePerKm, zones.interval.minPacePerKm)
    assert.isBelow(zones.interval.minPacePerKm, zones.threshold.minPacePerKm)
    assert.isBelow(zones.threshold.minPacePerKm, zones.marathon.minPacePerKm)
    assert.isBelow(zones.marathon.minPacePerKm, zones.easy.minPacePerKm)
  })

  test('zone E VDOT 44.7 : allure ~6:00-7:30 min/km (fourchette endurance)', ({ assert }) => {
    assert.isAbove(zones.easy.maxPacePerKm, 5.5)
    assert.isBelow(zones.easy.maxPacePerKm, 9)
  })

  test('toutes les zones ont des valeurs positives', ({ assert }) => {
    const zoneList = [zones.easy, zones.marathon, zones.threshold, zones.interval, zones.repetition]
    for (const zone of zoneList) {
      assert.isAbove(zone.minPacePerKm, 0)
      assert.isAbove(zone.maxPacePerKm, 0)
    }
  })
})

test.group('derivePaceZones — VDOT plus élevé → allures plus rapides', () => {
  test('VDOT 55 plus rapide que VDOT 40 sur toutes les zones', ({ assert }) => {
    const z40 = derivePaceZones(40)
    const z55 = derivePaceZones(55)
    assert.isBelow(z55.easy.minPacePerKm, z40.easy.minPacePerKm)
    assert.isBelow(z55.threshold.minPacePerKm, z40.threshold.minPacePerKm)
    assert.isBelow(z55.interval.minPacePerKm, z40.interval.minPacePerKm)
  })
})

// ── vdotFromVma ───────────────────────────────────────────────────────────────

test.group('vdotFromVma', () => {
  test('VMA 18 km/h → VDOT ~56 (coureur intermédiaire)', ({ assert }) => {
    const vdot = vdotFromVma(18)
    assert.approximately(vdot, 56, 5)
  })

  test('VMA 14 km/h → VDOT plus bas que VMA 20 km/h', ({ assert }) => {
    assert.isBelow(vdotFromVma(14), vdotFromVma(20))
  })

  test('VMA 12 km/h → VDOT positif (débutant)', ({ assert }) => {
    assert.isAbove(vdotFromVma(12), 0)
  })
})

// ── vdotFromQuestionnaire ─────────────────────────────────────────────────────

test.group('vdotFromQuestionnaire', () => {
  test('débutant total → VDOT conservateur (25)', ({ assert }) => {
    assert.equal(vdotFromQuestionnaire('never', 'beginner', 'less_5k'), 25)
  })

  test('coureur expérimenté fréquent longue distance → VDOT élevé (45)', ({ assert }) => {
    assert.equal(vdotFromQuestionnaire('frequent', 'experienced', 'more_10k'), 45)
  })

  test('VDOT croît avec le niveau', ({ assert }) => {
    const vdotBeginner = vdotFromQuestionnaire('occasional', 'beginner', 'less_5k')
    const vdotExperienced = vdotFromQuestionnaire('frequent', 'experienced', 'more_10k')
    assert.isAbove(vdotExperienced, vdotBeginner)
  })

  test('résultats dans une plage raisonnable [25, 45]', ({ assert }) => {
    const vdot = vdotFromQuestionnaire('regular', 'intermediate', '5k_to_10k')
    assert.isAtLeast(vdot, 25)
    assert.isAtMost(vdot, 45)
  })
})

// ── vdotFromHistory ───────────────────────────────────────────────────────────

function makeSession(distanceMeters: number, durationMinutes: number, daysAgo = 7): RunSession {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return { distanceMeters, durationMinutes, date, sportType: 'Run' }
}

test.group('vdotFromHistory — cas nominal', () => {
  test('3 séances éligibles → retourne un VDOT', ({ assert }) => {
    const sessions = [
      makeSession(5000, 25, 7),
      makeSession(8000, 40, 14),
      makeSession(10000, 50, 21),
    ]
    const vdot = vdotFromHistory(sessions)
    assert.isNotNull(vdot)
    assert.isAbove(vdot!, 0)
  })

  test('résultat cohérent avec calculateVdot sur les séances', ({ assert }) => {
    // Séances identiques → VDOT uniforme au 90e percentile = même valeur
    const sessions = [
      makeSession(5000, 20, 7),
      makeSession(5000, 20, 14),
      makeSession(5000, 20, 21),
    ]
    const vdot = vdotFromHistory(sessions)
    const expected = calculateVdot(5000, 20)
    assert.approximately(vdot!, expected, 0.1)
  })
})

test.group('vdotFromHistory — historique insuffisant', () => {
  test('moins de 3 séances → null', ({ assert }) => {
    const sessions = [makeSession(5000, 25, 7), makeSession(8000, 40, 14)]
    assert.isNull(vdotFromHistory(sessions))
  })

  test('liste vide → null', ({ assert }) => {
    assert.isNull(vdotFromHistory([]))
  })

  test('séances trop anciennes (> 6 semaines) → null', ({ assert }) => {
    const sessions = [
      makeSession(5000, 25, 50),
      makeSession(5000, 25, 55),
      makeSession(5000, 25, 60),
    ]
    assert.isNull(vdotFromHistory(sessions))
  })

  test('séances trop courtes (< 3km) → null', ({ assert }) => {
    const sessions = [makeSession(2000, 10, 7), makeSession(2500, 12, 14), makeSession(1500, 8, 21)]
    assert.isNull(vdotFromHistory(sessions))
  })

  test('séances de vélo ignorées → null si pas assez de running', ({ assert }) => {
    const sessions = [
      { distanceMeters: 20000, durationMinutes: 60, date: new Date(), sportType: 'Ride' },
      { distanceMeters: 20000, durationMinutes: 60, date: new Date(), sportType: 'Ride' },
      { distanceMeters: 20000, durationMinutes: 60, date: new Date(), sportType: 'Ride' },
    ]
    assert.isNull(vdotFromHistory(sessions))
  })
})
