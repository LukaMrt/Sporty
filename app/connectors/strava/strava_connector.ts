import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  SessionFilters,
  MappingContext,
  MappedSessionSummary,
  MappedSessionData,
} from '#domain/interfaces/connector'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import { StravaHttpClient } from '#connectors/strava/strava_http_client'
import type { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { RateLimitManager } from '#connectors/rate_limit_manager'
import { StravaSportMapper } from '#connectors/strava/strava_sport_mapper'
import type { SportySportSlug } from '#connectors/strava/strava_sport_mapper'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
const CYCLING_SLUGS: SportySportSlug[] = ['cycling']

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export class StravaConnector extends Connector {
  readonly id: number
  readonly #sportMapper = new StravaSportMapper()
  readonly #fetcher: Fetcher | undefined

  constructor(
    connectorId: number,
    private userId: number,
    private tokens: ConnectorTokens,
    private connectorRepository: ConnectorRepository,
    private rateLimitManager: RateLimitManager,
    private clientId: string,
    private clientSecret: string,
    options: { fetcher?: Fetcher } = {}
  ) {
    super()
    this.id = connectorId
    this.#fetcher = options.fetcher
  }

  async listSessions(filters: SessionFilters): Promise<MappedSessionSummary[]> {
    const client = this.#makeClient()

    const url = new URL(`${STRAVA_API_BASE}/athlete/activities`)
    url.searchParams.set('per_page', String(filters.perPage ?? 200))
    if (filters.after) {
      url.searchParams.set('after', String(Math.floor(filters.after.getTime() / 1000)))
    }
    if (filters.before) {
      url.searchParams.set('before', String(Math.floor(filters.before.getTime() / 1000)))
    }

    const raw = await client.get<RawStravaSummarySession[]>(url.toString())
    return raw.map((r) => this.#toMappedSummary(r))
  }

  async authenticate(): Promise<ConnectorTokens> {
    return this.tokens
  }

  async getSessionDetail(
    externalId: string,
    _context?: MappingContext
  ): Promise<MappedSessionData> {
    const client = this.#makeClient()
    const url = `${STRAVA_API_BASE}/activities/${externalId}`
    const raw = await client.get<RawStravaDetailedSession>(url)
    return this.#toMappedSessionData(raw)
  }

  async getConnectionStatus(): Promise<ConnectorStatus> {
    throw new Error('Not implemented')
  }

  async disconnect(): Promise<void> {
    throw new Error('Not implemented')
  }

  #makeClient(): StravaHttpClient {
    return new StravaHttpClient(
      this.userId,
      ConnectorProvider.Strava,
      this.tokens,
      this.connectorRepository,
      this.clientId,
      this.clientSecret,
      this.rateLimitManager,
      this.#fetcher
    )
  }

  #toMappedSummary(raw: RawStravaSummarySession): MappedSessionSummary {
    const sportSlug = this.#sportMapper.map(raw.sport_type)
    return {
      externalId: String(raw.id),
      name: raw.name,
      sportSlug,
      date: raw.start_date_local,
      durationMinutes: Math.round(raw.moving_time / 60),
      distanceKm:
        raw.distance !== null && raw.distance !== undefined && raw.distance > 0
          ? raw.distance / 1000
          : null,
      avgHeartRate: raw.average_heartrate ?? null,
    }
  }

  #toMappedSessionData(raw: RawStravaDetailedSession): MappedSessionData {
    const sportSlug = this.#sportMapper.map(raw.sport_type)
    const distanceKm =
      raw.distance !== null && raw.distance !== undefined && raw.distance > 0
        ? raw.distance / 1000
        : null
    const allure = this.#computeAllure(raw.average_speed ?? null, sportSlug)

    return {
      sportSlug,
      date: raw.start_date_local.slice(0, 10),
      durationMinutes: Math.round(raw.moving_time / 60),
      distanceKm,
      avgHeartRate: raw.average_heartrate ?? null,
      importedFrom: 'strava',
      externalId: String(raw.id),
      sportMetrics: {
        allure,
        calories: raw.calories ?? null,
        elevationGain: raw.total_elevation_gain ?? null,
        maxHeartRate: raw.max_heartrate ?? null,
        deviceName: raw.device_name ?? null,
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

interface RawStravaDetailedSession {
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

interface RawStravaSummarySession {
  id: number
  name: string
  sport_type: string
  start_date_local: string
  moving_time: number
  distance?: number | null
  average_heartrate?: number | null
}
