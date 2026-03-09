import { StravaSportMapper } from '#connectors/strava/strava_sport_mapper'
import type { SportySportSlug } from '#connectors/strava/strava_sport_mapper'

export interface StravaDetailedActivity {
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

export interface MappedActivity {
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

export class StravaActivityMapper {
  #sportMapper = new StravaSportMapper()

  map(activity: StravaDetailedActivity): MappedActivity {
    const sportSlug = this.#sportMapper.map(activity.sport_type)
    const distanceKm =
      activity.distance !== null && activity.distance !== undefined && activity.distance > 0
        ? activity.distance / 1000
        : null
    const avgHeartRate = activity.average_heartrate ?? null
    const allure = this.#computeAllure(activity.average_speed ?? null, sportSlug)

    return {
      name: activity.name,
      sportSlug,
      date: activity.start_date_local,
      durationMinutes: Math.round(activity.moving_time / 60),
      distanceKm,
      avgHeartRate,
      importedFrom: 'strava',
      externalId: activity.id,
      sportMetrics: {
        allure,
        calories: activity.calories ?? null,
        elevationGain: activity.total_elevation_gain ?? null,
        maxHeartRate: activity.max_heartrate ?? null,
        deviceName: activity.device_name ?? null,
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
