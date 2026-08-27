import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dedupeWorkouts } from '#connectors/open_wearables/workout_deduplicator'
import type { RawOwWorkout, RawOwSource } from '#connectors/open_wearables/types'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/open_wearables'
)

function loadFixture(name: string): { data: RawOwWorkout[] } {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8')) as { data: RawOwWorkout[] }
}

const XML_SOURCE: RawOwSource = {
  provider: 'apple',
  source: 'apple_health_xml',
  device: 'Watch',
  device_type: 'watch',
  device_name: null,
}

const LIVE_SOURCE: RawOwSource = {
  provider: 'apple',
  source: 'Luka Apple Watch',
  device: 'Watch7,9',
  device_type: 'watch',
  device_name: 'Apple Watch Series 10',
}

function makeWorkout(overrides: Partial<RawOwWorkout> = {}): RawOwWorkout {
  return {
    id: 'a0000000-0000-0000-0000-000000000000',
    type: 'running',
    name: null,
    start_time: '2026-08-07T10:24:14+02:00',
    end_time: '2026-08-07T13:24:14+02:00',
    zone_offset: '+02:00',
    duration_seconds: 3600,
    source: LIVE_SOURCE,
    calories_kcal: null,
    distance_meters: null,
    avg_heart_rate_bpm: null,
    max_heart_rate_bpm: null,
    avg_pace_sec_per_km: null,
    elevation_gain_meters: null,
    ...overrides,
  }
}

test.group('dedupeWorkouts', () => {
  test('cas reel du 2026-08-07 : garde l enregistrement avec distance', ({ assert }) => {
    const workouts = loadFixture('workouts_page.json').data
    const hiking = workouts.filter((w) => w.start_time.startsWith('2026-08-07'))
    assert.lengthOf(hiking, 2, 'la fixture doit contenir le doublon')

    const result = dedupeWorkouts(hiking)

    assert.lengthOf(result, 1)
    assert.equal(result[0].duration_seconds, 10701, 'le temps actif, pas le temps ecoule')
    assert.closeTo(result[0].distance_meters!, 9048.167, 0.01)
    assert.closeTo(result[0].elevation_gain_meters!, 384.15, 0.01)
  })

  test('la fixture complete se reduit au nombre de seances distinctes', ({ assert }) => {
    const workouts = loadFixture('workouts_page.json').data
    const distinct = new Set(workouts.map((w) => `${new Date(w.start_time).getTime()}|${w.type}`))

    const result = dedupeWorkouts(workouts)

    assert.equal(result.length, distinct.size)
    assert.isBelow(result.length, workouts.length, 'la fixture contient bien des doublons')
  })

  test('sans distance des deux cotes, garde la duree la plus courte (temps actif)', ({
    assert,
  }) => {
    const result = dedupeWorkouts([
      makeWorkout({ id: 'b', duration_seconds: 12578, source: XML_SOURCE }),
      makeWorkout({ id: 'a', duration_seconds: 10701, source: LIVE_SOURCE }),
    ])

    assert.lengthOf(result, 1)
    assert.equal(result[0].duration_seconds, 10701)
  })

  test('la distance prime sur la duree la plus courte', ({ assert }) => {
    const result = dedupeWorkouts([
      makeWorkout({ id: 'a', duration_seconds: 100, distance_meters: null }),
      makeWorkout({ id: 'b', duration_seconds: 9999, distance_meters: 5000 }),
    ])

    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'b')
  })

  test('egalite parfaite : deterministe sur le plus petit id', ({ assert }) => {
    const forward = dedupeWorkouts([makeWorkout({ id: 'zzz' }), makeWorkout({ id: 'aaa' })])
    const reversed = dedupeWorkouts([makeWorkout({ id: 'aaa' }), makeWorkout({ id: 'zzz' })])

    assert.equal(forward[0].id, 'aaa')
    assert.equal(reversed[0].id, 'aaa')
  })

  test('deux offsets differents pour le meme instant sont fusionnes', ({ assert }) => {
    const result = dedupeWorkouts([
      makeWorkout({ id: 'a', start_time: '2026-08-07T10:24:14+02:00' }),
      makeWorkout({ id: 'b', start_time: '2026-08-07T08:24:14+00:00', distance_meters: 4000 }),
    ])

    assert.lengthOf(result, 1, 'meme instant UTC malgre des offsets differents')
    assert.equal(result[0].id, 'b')
  })

  test('meme type a des heures differentes : non fusionnes', ({ assert }) => {
    const result = dedupeWorkouts([
      makeWorkout({ id: 'a', start_time: '2026-08-07T10:24:14+02:00' }),
      makeWorkout({ id: 'b', start_time: '2026-08-07T18:00:00+02:00' }),
    ])

    assert.lengthOf(result, 2)
  })

  test('meme instant mais types differents : non fusionnes', ({ assert }) => {
    const result = dedupeWorkouts([
      makeWorkout({ id: 'a', type: 'running' }),
      makeWorkout({ id: 'b', type: 'cycling' }),
    ])

    assert.lengthOf(result, 2)
  })

  test('fusion enrichissante : recupere les champs absents chez le gagnant', ({ assert }) => {
    const result = dedupeWorkouts([
      makeWorkout({
        id: 'winner',
        distance_meters: 9048,
        calories_kcal: null,
        max_heart_rate_bpm: null,
      }),
      makeWorkout({
        id: 'loser',
        distance_meters: null,
        calories_kcal: 1188.8,
        max_heart_rate_bpm: 168,
        source: XML_SOURCE,
      }),
    ])

    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'winner')
    assert.closeTo(result[0].calories_kcal!, 1188.8, 0.01)
    assert.equal(result[0].max_heart_rate_bpm, 168)
  })

  test('la fusion ne remplace jamais duree ni distance du gagnant', ({ assert }) => {
    const result = dedupeWorkouts([
      makeWorkout({ id: 'winner', duration_seconds: 10701, distance_meters: 9048 }),
      makeWorkout({ id: 'loser', duration_seconds: 12578, distance_meters: 99999 }),
    ])

    assert.equal(result[0].duration_seconds, 10701)
    assert.equal(result[0].distance_meters, 9048)
  })

  test('tableau vide', ({ assert }) => {
    assert.deepEqual(dedupeWorkouts([]), [])
  })

  test('enregistrement unique inchange', ({ assert }) => {
    const single = makeWorkout({ id: 'solo', distance_meters: 1234 })
    const result = dedupeWorkouts([single])

    assert.lengthOf(result, 1)
    assert.deepEqual(result[0], single)
  })
})
