import { test } from '@japa/runner'
import { toDailyWellness } from '#connectors/open_wearables/wellness_converter'
import type { RawOwTimeSeriesSample } from '#connectors/open_wearables/types'

const sample = (type: string, timestamp: string, value: number) =>
  ({
    type,
    timestamp,
    value,
    unit: '',
    zone_offset: null,
    source: {},
    is_daily_total: null,
  }) as unknown as RawOwTimeSeriesSample

test.group('toDailyWellness (Open Wearables)', () => {
  test('agrège les séries par jour local (moyenne / dernière valeur)', ({ assert }) => {
    const days = toDailyWellness({
      samples: [
        sample('heart_rate_variability_rmssd', '2026-03-01T03:00:00+01:00', 50),
        sample('heart_rate_variability_rmssd', '2026-03-01T05:00:00+01:00', 60),
        sample('weight', '2026-03-01T07:00:00+01:00', 70.4),
        sample('weight', '2026-03-01T19:00:00+01:00', 71),
        sample('unknown_type', '2026-03-01T07:00:00+01:00', 1),
      ],
      sleeps: [],
      activities: [],
    })
    assert.lengthOf(days, 1)
    assert.equal(days[0].hrvRmssd, 55)
    assert.equal(days[0].weightKg, 71)
  })

  test('sommeil rattaché au jour du réveil, phases, siestes ignorées', ({ assert }) => {
    const days = toDailyWellness({
      samples: [],
      sleeps: [
        {
          start_time: '2026-02-28T23:00:00+01:00',
          end_time: '2026-03-01T07:00:00+01:00',
          efficiency: 0.92,
          stages: [
            {
              stage: 'deep',
              start_time: '2026-02-28T23:30:00+01:00',
              end_time: '2026-03-01T00:30:00+01:00',
            },
            {
              stage: 'rem',
              start_time: '2026-03-01T05:00:00+01:00',
              end_time: '2026-03-01T06:00:00+01:00',
            },
          ],
        },
        {
          start_time: '2026-03-01T14:00:00+01:00',
          end_time: '2026-03-01T14:30:00+01:00',
          is_nap: true,
        },
      ],
      activities: [
        { date: '2026-03-01', steps: 12000, intensity_minutes: { moderate: 20, vigorous: 15 } },
      ],
    })
    assert.equal(days[0].date, '2026-03-01')
    assert.equal(days[0].sleepMinutes, 480)
    assert.equal(days[0].sleepEfficiency, 92)
    assert.equal(days[0].sleepDeepMinutes, 60)
    assert.equal(days[0].sleepRemMinutes, 60)
    assert.equal(days[0].steps, 12000)
    assert.equal(days[0].activeMinutes, 35)
  })
})

test.group('toDailyWellness — résumés, scores et nouvelles séries', () => {
  test('résumé de sommeil : horaires, réveils, mesures nocturnes prioritaires', ({ assert }) => {
    const days = toDailyWellness({
      samples: [
        // Moyenne de la journée : remplacée par la valeur mesurée la nuit
        sample('heart_rate_variability_rmssd', '2026-03-01T15:00:00+01:00', 30),
        sample('respiratory_rate', '2026-03-01T15:00:00+01:00', 18),
      ],
      sleepSummaries: [
        {
          date: '2026-03-01',
          start_time: '2026-02-28T23:30:00+01:00',
          end_time: '2026-03-01T07:15:00+01:00',
          duration_minutes: 440,
          efficiency_percent: 91,
          stages: { deep_minutes: 80, rem_minutes: 95, light_minutes: 245, awake_minutes: 20 },
          interruptions_count: 3,
          nap_duration_minutes: 20,
          avg_heart_rate_bpm: 48,
          avg_hrv_rmssd_ms: 62.34,
          avg_respiratory_rate: 13.8,
          avg_spo2_percent: 96.2,
        },
      ],
      // Événement de la même nuit : ignoré, le résumé fait foi
      sleeps: [{ start_time: '2026-02-28T22:00:00+01:00', end_time: '2026-03-01T06:00:00+01:00' }],
      activities: [],
    })
    const day = days[0]
    assert.equal(day.sleepMinutes, 440)
    assert.equal(day.sleepBedtimeMinutes, -30)
    assert.equal(day.sleepWakeMinutes, 435)
    assert.equal(day.sleepInterruptions, 3)
    assert.equal(day.napMinutes, 20)
    assert.equal(day.sleepHeartRate, 48)
    assert.equal(day.sleepDeepMinutes, 80)
    assert.equal(day.hrvRmssd, 62.3)
    assert.equal(day.respiratoryRate, 13.8)
    assert.equal(day.spo2, 96.2)
  })

  test('scores de la montre lus par catégorie (bug : le score de sommeil était ignoré)', ({
    assert,
  }) => {
    const days = toDailyWellness({
      samples: [
        // Secours Garmin : remplacé par le score officiel
        sample('garmin_body_battery', '2026-03-01T07:00:00+01:00', 60),
      ],
      sleeps: [],
      activities: [],
      scores: [
        { category: 'sleep', value: 82, recorded_at: '2026-03-01T07:00:00+01:00' },
        { category: 'readiness', value: 71, recorded_at: '2026-03-01T07:00:00+01:00' },
        { category: 'body_battery', value: 88, recorded_at: '2026-03-01T07:00:00+01:00' },
        { category: 'resilience', value: 50, recorded_at: '2026-03-01T07:00:00+01:00' },
        { category: 'stress', value: null, recorded_at: '2026-03-01T07:00:00+01:00' },
      ],
    })
    assert.equal(days[0].sleepScore, 82)
    assert.equal(days[0].readinessScore, 71)
    assert.equal(days[0].bodyBattery, 88)
    assert.isNull(days[0].stressScore)
  })

  test('Body Battery au plus haut de la journée, FC de récupération, activité', ({ assert }) => {
    const days = toDailyWellness({
      samples: [
        sample('garmin_body_battery', '2026-03-01T06:00:00+01:00', 85),
        sample('garmin_body_battery', '2026-03-01T20:00:00+01:00', 30),
        sample('heart_rate_recovery_one_minute', '2026-03-01T10:00:00+01:00', 28),
      ],
      sleeps: [],
      activities: [{ date: '2026-03-01', active_calories_kcal: 640, sedentary_minutes: 510 }],
    })
    assert.equal(days[0].bodyBattery, 85)
    assert.equal(days[0].heartRateRecovery, 28)
    assert.equal(days[0].activeCaloriesKcal, 640)
    assert.equal(days[0].sedentaryMinutes, 510)
  })
})

test.group('toRunningDynamics (Open Wearables)', () => {
  test('moyennes et courbes rééchantillonnées à 15 s', async ({ assert }) => {
    const { toRunningDynamics } = await import('#connectors/open_wearables/timeseries_converter')
    const start = '2026-03-01T08:00:00+01:00'
    const at = (s: number) => new Date(Date.parse(start) + s * 1000).toISOString()
    const dynamics = toRunningDynamics(
      [
        sample('running_power', at(0), 240),
        sample('running_power', at(10), 260),
        sample('running_power', at(20), 300),
        sample('cadence', at(5), 170),
        sample('heart_rate', at(5), 150),
      ],
      start
    )!
    assert.deepEqual(dynamics.curves.power, [
      { time: 0, value: 250 },
      { time: 15, value: 300 },
    ])
    assert.equal(dynamics.averages.power, 275)
    assert.equal(dynamics.averages.cadence, 170)
    assert.isUndefined(dynamics.averages.strideLength)
  })

  test('aucune série de dynamique → null', async ({ assert }) => {
    const { toRunningDynamics } = await import('#connectors/open_wearables/timeseries_converter')
    assert.isNull(toRunningDynamics([], '2026-03-01T08:00:00+01:00'))
  })
})
