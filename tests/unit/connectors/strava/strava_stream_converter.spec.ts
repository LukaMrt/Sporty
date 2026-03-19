import { test } from '@japa/runner'
import {
  stravaStreamsToTrackpoints,
  indexStravaStreams,
} from '#connectors/strava/strava_stream_converter'
import type { StravaStreams } from '#connectors/strava/strava_stream_converter'

// ─── Fixture minimale ──────────────────────────────────────────────────────────

const FULL_STREAMS: StravaStreams = {
  time: { data: [0, 10, 20, 30] },
  latlng: {
    data: [
      [48.856, 2.352],
      [48.857, 2.353],
      [48.858, 2.354],
      [48.859, 2.355],
    ],
  },
  altitude: { data: [50, 51, 52, 53] },
  heartrate: { data: [140, 145, 150, 155] },
  cadence: { data: [85, 86, 87, 88] },
  distance: { data: [0, 42, 84, 126] },
}

// ─── Tests : indexStravaStreams ─────────────────────────────────────────────────

test.group('indexStravaStreams', () => {
  test('convertit le tableau API en dict indexé par type', ({ assert }) => {
    const raw = [
      { type: 'time', data: [0, 1, 2], series_type: 'time', original_size: 3, resolution: 'high' },
      {
        type: 'heartrate',
        data: [140, 145, 150],
        series_type: 'time',
        original_size: 3,
        resolution: 'high',
      },
    ]
    const result = indexStravaStreams(raw)
    assert.deepEqual(result.time?.data, [0, 1, 2])
    assert.deepEqual(result.heartrate?.data, [140, 145, 150])
  })

  test('streams absents restent undefined', ({ assert }) => {
    const raw = [
      { type: 'time', data: [0, 1], series_type: 'time', original_size: 2, resolution: 'high' },
    ]
    const result = indexStravaStreams(raw)
    assert.isUndefined(result.latlng)
    assert.isUndefined(result.heartrate)
  })
})

// ─── Tests : stravaStreamsToTrackpoints ─────────────────────────────────────────

test.group('stravaStreamsToTrackpoints — streams complets', () => {
  test('retourne autant de points que de timestamps', ({ assert }) => {
    const result = stravaStreamsToTrackpoints(FULL_STREAMS)
    assert.equal(result.length, 4)
  })

  test('time en secondes → timeMs en millisecondes', ({ assert }) => {
    const result = stravaStreamsToTrackpoints(FULL_STREAMS)
    assert.equal(result[0].timeMs, 0)
    assert.equal(result[1].timeMs, 10000)
    assert.equal(result[3].timeMs, 30000)
  })

  test('latlng[i][0] → lat, latlng[i][1] → lon', ({ assert }) => {
    const result = stravaStreamsToTrackpoints(FULL_STREAMS)
    assert.equal(result[0].lat, 48.856)
    assert.equal(result[0].lon, 2.352)
    assert.equal(result[2].lat, 48.858)
  })

  test('altitude → ele', ({ assert }) => {
    const result = stravaStreamsToTrackpoints(FULL_STREAMS)
    assert.equal(result[0].ele, 50)
    assert.equal(result[3].ele, 53)
  })

  test('heartrate → hr', ({ assert }) => {
    const result = stravaStreamsToTrackpoints(FULL_STREAMS)
    assert.equal(result[0].hr, 140)
    assert.equal(result[2].hr, 150)
  })

  test('cadence → cad', ({ assert }) => {
    const result = stravaStreamsToTrackpoints(FULL_STREAMS)
    assert.equal(result[1].cad, 86)
  })

  test('distance → distanceCum', ({ assert }) => {
    const result = stravaStreamsToTrackpoints(FULL_STREAMS)
    assert.equal(result[0].distanceCum, 0)
    assert.equal(result[3].distanceCum, 126)
  })
})

test.group('stravaStreamsToTrackpoints — streams partiels', () => {
  test('sans heartrate → hr undefined sur chaque point', ({ assert }) => {
    const streams: StravaStreams = { ...FULL_STREAMS, heartrate: undefined }
    const result = stravaStreamsToTrackpoints(streams)
    assert.equal(result.length, 4)
    assert.isUndefined(result[0].hr)
    assert.isUndefined(result[2].hr)
  })

  test('sans altitude → ele undefined', ({ assert }) => {
    const streams: StravaStreams = { ...FULL_STREAMS, altitude: undefined }
    const result = stravaStreamsToTrackpoints(streams)
    assert.isUndefined(result[0].ele)
  })

  test('sans distance → distanceCum undefined', ({ assert }) => {
    const streams: StravaStreams = { ...FULL_STREAMS, distance: undefined }
    const result = stravaStreamsToTrackpoints(streams)
    assert.isUndefined(result[0].distanceCum)
  })

  test('sans cadence → cad undefined', ({ assert }) => {
    const streams: StravaStreams = { ...FULL_STREAMS, cadence: undefined }
    const result = stravaStreamsToTrackpoints(streams)
    assert.isUndefined(result[0].cad)
  })
})

test.group('stravaStreamsToTrackpoints — absence de streams requis', () => {
  test('sans latlng → retourne []', ({ assert }) => {
    const streams: StravaStreams = { ...FULL_STREAMS, latlng: undefined }
    assert.deepEqual(stravaStreamsToTrackpoints(streams), [])
  })

  test('sans time → retourne []', ({ assert }) => {
    const streams: StravaStreams = { ...FULL_STREAMS, time: undefined }
    assert.deepEqual(stravaStreamsToTrackpoints(streams), [])
  })

  test('time vide → retourne []', ({ assert }) => {
    const streams: StravaStreams = { ...FULL_STREAMS, time: { data: [] } }
    assert.deepEqual(stravaStreamsToTrackpoints(streams), [])
  })

  test('streams complètement vides → retourne []', ({ assert }) => {
    assert.deepEqual(stravaStreamsToTrackpoints({}), [])
  })
})
