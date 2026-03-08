import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  ActivityFilters,
  ActivitySummary,
  ActivityDetail,
} from '#domain/interfaces/connector'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { StravaHttpClient } from '#connectors/strava/strava_http_client'
import type { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { RateLimitManager } from '#connectors/rate_limit_manager'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

export class StravaConnector extends Connector {
  readonly id: number

  constructor(
    connectorId: number,
    private userId: number,
    private tokens: ConnectorTokens,
    private connectorRepository: ConnectorRepository,
    private rateLimitManager: RateLimitManager,
    private clientId: string,
    private clientSecret: string
  ) {
    super()
    this.id = connectorId
  }

  async listActivities(filters: ActivityFilters): Promise<ActivitySummary[]> {
    const client = new StravaHttpClient(
      this.userId,
      ConnectorProvider.Strava,
      this.tokens,
      this.connectorRepository,
      this.clientId,
      this.clientSecret,
      this.rateLimitManager
    )

    const url = new URL(`${STRAVA_API_BASE}/athlete/activities`)
    url.searchParams.set('per_page', String(filters.perPage ?? 200))
    if (filters.after) {
      url.searchParams.set('after', String(Math.floor(filters.after.getTime() / 1000)))
    }
    if (filters.before) {
      url.searchParams.set('before', String(Math.floor(filters.before.getTime() / 1000)))
    }

    const raw = await client.get<RawStravaSummaryActivity[]>(url.toString())
    return raw.map(toActivitySummary)
  }

  async authenticate(): Promise<ConnectorTokens> {
    return this.tokens
  }

  async getActivityDetail(_externalId: string): Promise<ActivityDetail> {
    throw new Error('Not implemented')
  }

  async getConnectionStatus(): Promise<ConnectorStatus> {
    throw new Error('Not implemented')
  }

  async disconnect(): Promise<void> {
    throw new Error('Not implemented')
  }
}

interface RawStravaSummaryActivity {
  id: number
  name: string
  sport_type: string
  start_date_local: string
  moving_time: number
  distance?: number | null
  average_heartrate?: number | null
}

function toActivitySummary(raw: RawStravaSummaryActivity): ActivitySummary {
  return {
    externalId: String(raw.id),
    name: raw.name,
    sportType: raw.sport_type,
    startDate: raw.start_date_local,
    durationSeconds: raw.moving_time,
    distanceMeters: raw.distance ?? null,
    averageHeartRate: raw.average_heartrate ?? null,
  }
}
