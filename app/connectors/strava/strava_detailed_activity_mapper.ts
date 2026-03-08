import { ActivityMapper } from '#domain/interfaces/activity_mapper'
import type { MappedSessionData } from '#domain/interfaces/activity_mapper'
import type { ActivityDetail } from '#domain/interfaces/connector'
import { StravaActivityMapper } from '#connectors/strava/strava_activity_mapper'
import type { StravaDetailedActivity } from '#connectors/strava/strava_activity_mapper'

export class StravaDetailedActivityMapper extends ActivityMapper {
  readonly #inner = new StravaActivityMapper()

  map(detail: ActivityDetail): MappedSessionData {
    const raw: StravaDetailedActivity = {
      id: Number(detail.externalId),
      name: detail.name,
      sport_type: detail.sportType,
      start_date_local: detail.startDate,
      moving_time: detail.durationSeconds,
      distance: detail.distanceMeters,
      average_heartrate: detail.averageHeartRate,
      average_speed: (detail.metrics['averageSpeed'] as number | null) ?? null,
      calories: (detail.metrics['calories'] as number | null) ?? null,
      total_elevation_gain: (detail.metrics['totalElevationGain'] as number | null) ?? null,
      max_heartrate: (detail.metrics['maxHeartrate'] as number | null) ?? null,
      device_name: (detail.metrics['deviceName'] as string | null) ?? null,
    }

    const mapped = this.#inner.map(raw)

    return {
      sportSlug: mapped.sportSlug,
      date: mapped.date.slice(0, 10),
      durationMinutes: mapped.durationMinutes,
      distanceKm: mapped.distanceKm,
      avgHeartRate: mapped.avgHeartRate,
      importedFrom: 'strava',
      externalId: String(mapped.externalId),
      sportMetrics: {
        allure: mapped.sportMetrics.allure,
        calories: mapped.sportMetrics.calories,
        elevationGain: mapped.sportMetrics.elevationGain,
        maxHeartRate: mapped.sportMetrics.maxHeartRate,
        deviceName: mapped.sportMetrics.deviceName,
      },
    }
  }
}
