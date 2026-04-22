import type { RawTrackpoint } from '#lib/track_analyzer'

/**
 * Format brut retourné par l'API Strava : tableau de streams.
 * Chaque entrée a un `type` (ex. "time", "heartrate") et un `data`.
 */
export interface RawStravaStream {
  type: string
  data: unknown[]
}

/**
 * Dict normalisé (type → data) utilisé par le converteur.
 * Construit depuis le tableau brut de l'API via `indexStravaStreams()`.
 */
export interface StravaStreams {
  time?: { data: number[] }
  heartrate?: { data: number[] }
  latlng?: { data: [number, number][] }
  altitude?: { data: number[] }
  velocity_smooth?: { data: number[] }
  distance?: { data: number[] }
  cadence?: { data: number[] }
}

/**
 * Convertit le tableau brut de l'API Strava en dict indexé par type.
 */
export function indexStravaStreams(raw: RawStravaStream[]): StravaStreams {
  return Object.fromEntries(raw.map((s) => [s.type, { data: s.data }]))
}

/**
 * Convertit les streams Strava en tableau de RawTrackpoint pour le TrackAnalyzer.
 *
 * Règles :
 * - Retourne [] si `time` ou `latlng` sont absents (requis par le TrackAnalyzer).
 * - `time.data` est en secondes relatives → converti en ms pour `timeMs`.
 * - Les streams partiels (heartrate, altitude, cadence, distance absents) → champ `undefined`.
 * - `velocity_smooth` n'est pas utilisé : le TrackAnalyzer calcule l'allure depuis GPS + distance.
 */
export function stravaStreamsToTrackpoints(streams: StravaStreams): RawTrackpoint[] {
  const timeData = streams.time?.data
  const latlngData = streams.latlng?.data

  if (!timeData || !latlngData || timeData.length === 0) {
    return []
  }

  const hrData = streams.heartrate?.data
  const eleData = streams.altitude?.data
  const cadData = streams.cadence?.data
  const distData = streams.distance?.data

  const length = Math.min(timeData.length, latlngData.length)

  return timeData.slice(0, length).map((timeSec, i) => {
    const point: RawTrackpoint = {
      timeMs: timeSec * 1000,
      lat: latlngData[i][0],
      lon: latlngData[i][1],
    }
    if (eleData !== undefined) point.ele = eleData[i]
    if (hrData !== undefined) point.hr = hrData[i]
    if (cadData !== undefined) point.cad = cadData[i]
    if (distData !== undefined) point.distanceCum = distData[i]
    return point
  })
}
