import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toHeartRateCurve } from '#connectors/open_wearables/timeseries_converter'
import type { RawOwTimeSeriesSample } from '#connectors/open_wearables/types'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/open_wearables'
)

const START = '2026-08-24T13:18:34+02:00'

function sample(timestamp: string, value: number, type = 'heart_rate'): RawOwTimeSeriesSample {
  return {
    timestamp,
    zone_offset: null,
    type,
    value,
    unit: 'bpm',
    source: {
      provider: 'apple',
      source: 'watch',
      device: 'Watch7,9',
      device_type: 'watch',
      device_name: null,
    },
    is_daily_total: null,
  }
}

test.group('toHeartRateCurve', () => {
  test('convertit la fixture reelle en courbe croissante en temps', ({ assert }) => {
    const raw = JSON.parse(readFileSync(join(fixturesDir, 'timeseries_page.json'), 'utf-8')) as {
      data: RawOwTimeSeriesSample[]
    }

    const curve = toHeartRateCurve(raw.data, START)

    assert.isAbove(curve.length, 50)
    for (let i = 1; i < curve.length; i++) {
      assert.isAbove(curve[i].time, curve[i - 1].time)
    }
    assert.isTrue(curve.every((p) => p.value >= 25 && p.value <= 250))
  })

  test('time est le nombre de secondes depuis le debut de la seance', ({ assert }) => {
    const curve = toHeartRateCurve(
      [sample('2026-08-24T13:18:34+02:00', 100), sample('2026-08-24T13:19:34+02:00', 120)],
      START
    )

    assert.deepEqual(curve, [
      { time: 0, value: 100 },
      { time: 60, value: 120 },
    ])
  })

  test('trie les echantillons desordonnes', ({ assert }) => {
    const curve = toHeartRateCurve(
      [sample('2026-08-24T13:20:34+02:00', 140), sample('2026-08-24T13:19:34+02:00', 120)],
      START
    )

    assert.deepEqual(
      curve.map((p) => p.time),
      [60, 120]
    )
  })

  test('ignore les doublons de timestamp', ({ assert }) => {
    const curve = toHeartRateCurve(
      [
        sample('2026-08-24T13:19:34+02:00', 120),
        sample('2026-08-24T13:19:34+02:00', 125),
        sample('2026-08-24T13:20:34+02:00', 130),
      ],
      START
    )

    assert.lengthOf(curve, 2)
    assert.equal(curve[0].value, 120, 'premier vu conserve')
  })

  test('filtre les valeurs aberrantes', ({ assert }) => {
    const curve = toHeartRateCurve(
      [
        sample('2026-08-24T13:19:00+02:00', 5),
        sample('2026-08-24T13:19:34+02:00', 120),
        sample('2026-08-24T13:20:00+02:00', 400),
        sample('2026-08-24T13:20:34+02:00', 130),
      ],
      START
    )

    assert.deepEqual(
      curve.map((p) => p.value),
      [120, 130]
    )
  })

  test('ignore les echantillons anterieurs au debut', ({ assert }) => {
    const curve = toHeartRateCurve(
      [
        sample('2026-08-24T13:10:00+02:00', 70),
        sample('2026-08-24T13:19:34+02:00', 120),
        sample('2026-08-24T13:20:34+02:00', 130),
      ],
      START
    )

    assert.lengthOf(curve, 2)
    assert.isTrue(curve.every((p) => p.time >= 0))
  })

  test('ignore les echantillons trop apres la fin quand la duree est connue', ({ assert }) => {
    const curve = toHeartRateCurve(
      [
        sample('2026-08-24T13:19:34+02:00', 120),
        sample('2026-08-24T13:20:34+02:00', 130),
        sample('2026-08-24T15:00:00+02:00', 90),
      ],
      START,
      300
    )

    assert.lengthOf(curve, 2)
  })

  test('ignore les types non cardiaques', ({ assert }) => {
    const curve = toHeartRateCurve(
      [
        sample('2026-08-24T13:19:34+02:00', 120),
        sample('2026-08-24T13:19:40+02:00', 5000, 'steps'),
        sample('2026-08-24T13:20:34+02:00', 130),
      ],
      START
    )

    assert.lengthOf(curve, 2)
  })

  test('moins de 2 points exploitables retourne une courbe vide', ({ assert }) => {
    assert.deepEqual(toHeartRateCurve([], START), [])
    assert.deepEqual(toHeartRateCurve([sample('2026-08-24T13:19:34+02:00', 120)], START), [])
  })

  test('date de depart invalide retourne une courbe vide', ({ assert }) => {
    const curve = toHeartRateCurve(
      [sample('2026-08-24T13:19:34+02:00', 120), sample('2026-08-24T13:20:34+02:00', 130)],
      'pas-une-date'
    )

    assert.deepEqual(curve, [])
  })
})
