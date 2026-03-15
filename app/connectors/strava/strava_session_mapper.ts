import { StravaSportMapper } from '#connectors/strava/strava_sport_mapper'
import type { SportySportSlug } from '#connectors/strava/strava_sport_mapper'

export interface StravaDetailedSession {
  id: number
  name: string
  sport_type: string
  start_date_local: string
  moving_time: number
  distance?: number | null
  average_heartrate?: number | null
  average_speed?: number | null
  calories?: number | null
  total_elevation_gain?: number | null
  max_heartrate?: number | null
  device_name?: string | null
}

export interface MappedSession {
  name: string
  sportSlug: SportySportSlug
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  importedFrom: 'strava'
  externalId: number
  sportMetrics: {
    allure: number | null
    calories: number | null
    elevationGain: number | null
    maxHeartRate: number | null
    deviceName: string | null
  }
}

const CYCLING_SLUGS: SportySportSlug[] = ['cycling']

export class StravaSessionMapper {
  #sportMapper = new StravaSportMapper()

  map(session: StravaDetailedSession): MappedSession {
    const sportSlug = this.#sportMapper.map(session.sport_type)
    const distanceKm =
      session.distance !== null && session.distance !== undefined && session.distance > 0
        ? session.distance / 1000
        : null
    const avgHeartRate = session.average_heartrate ?? null
    const allure = this.#computeAllure(session.average_speed ?? null, sportSlug)

    return {
      name: session.name,
      sportSlug,
      date: session.start_date_local,
      durationMinutes: Math.round(session.moving_time / 60),
      distanceKm,
      avgHeartRate,
      importedFrom: 'strava',
      externalId: session.id,
      sportMetrics: {
        allure,
        calories: session.calories ?? null,
        elevationGain: session.total_elevation_gain ?? null,
        maxHeartRate: session.max_heartrate ?? null,
        deviceName: session.device_name ?? null,
      },
    }
  }

  #computeAllure(speedMs: number | null, sportSlug: SportySportSlug): number | null {
    if (speedMs === null || speedMs <= 0) return null
    if (CYCLING_SLUGS.includes(sportSlug)) {
      return speedMs * 3.6
    }
    return 1000 / (speedMs * 60)
  }
}
