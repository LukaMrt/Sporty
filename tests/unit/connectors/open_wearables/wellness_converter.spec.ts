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
