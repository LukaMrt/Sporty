import { Connector } from '#domain/interfaces/connector'
import type {
  ConnectorTokens,
  SessionFilters,
  MappingContext,
  MappedSessionSummary,
  MappedSessionData,
} from '#domain/interfaces/connector'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import { StravaHttpClient } from '#connectors/strava/strava_http_client'
import type { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { RateLimitManager } from '#connectors/rate_limit_manager'
import { StravaSportMapper } from '#connectors/strava/strava_sport_mapper'
import type { SportySportSlug } from '#connectors/strava/strava_sport_mapper'
import {
  indexStravaStreams,
  stravaStreamsToTrackpoints,
} from '#connectors/strava/strava_stream_converter'
import type { RawStravaStream } from '#connectors/strava/strava_stream_converter'
import type { RunMetrics } from '#domain/value_objects/run_metrics'
import { analyze } from '#lib/track_analyzer'
import logger from '@adonisjs/core/services/logger'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
const CYCLING_SLUGS: SportySportSlug[] = ['cycling']
const RUNNING_SLUGS: SportySportSlug[] = ['running']
const STREAMS_KEYS = 'time,heartrate,latlng,altitude,velocity_smooth,distance,cadence'
/** Taille de page maximale autorisée par Strava */
const PAGE_SIZE = 200
/** Garde-fou : 20 pages × 200 = 4 000 activités par fenêtre */
const MAX_PAGES = 20

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

    const perPage = Math.min(filters.perPage ?? PAGE_SIZE, PAGE_SIZE)
    const all: RawStravaSummarySession[] = []

    // Pagination : au-delà d'une page, les activités étaient silencieusement ignorées
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = new URL(`${STRAVA_API_BASE}/athlete/activities`)
      url.searchParams.set('per_page', String(perPage))
      url.searchParams.set('page', String(page))
      if (filters.after) {
        url.searchParams.set('after', String(Math.floor(filters.after.getTime() / 1000)))
      }
      if (filters.before) {
        url.searchParams.set('before', String(Math.floor(filters.before.getTime() / 1000)))
      }
      const batch = await client.get<RawStravaSummarySession[]>(url.toString())
      all.push(...batch)
      if (batch.length < perPage) break
      if (page === MAX_PAGES) {
        logger.warn({ userId: this.userId, pages: MAX_PAGES }, 'Strava activity list truncated')
      }
    }

    return all.map((r) => this.#toMappedSummary(r))
  }

  async getSessionDetail(externalId: string, context?: MappingContext): Promise<MappedSessionData> {
    const client = this.#makeClient()
    const url = `${STRAVA_API_BASE}/activities/${externalId}`
    const raw = await client.get<RawStravaDetailedSession>(url)

    const sportSlug = this.#sportMapper.map(raw.sport_type)
    const base = this.#toMappedSessionData(raw, sportSlug)

    if (!RUNNING_SLUGS.includes(sportSlug)) {
      return base
    }

    let trackpoints: ReturnType<typeof stravaStreamsToTrackpoints> = []
    try {
      const streamsUrl = `${STRAVA_API_BASE}/activities/${externalId}/streams?keys=${STREAMS_KEYS}`
      const rawStreams = await client.get<RawStravaStream[]>(streamsUrl)
      trackpoints = stravaStreamsToTrackpoints(indexStravaStreams(rawStreams))
    } catch (error) {
      // Dégradation voulue : streams indisponibles → séance sans courbes
      logger.warn(
        { err: error, externalId },
        'Strava streams unavailable, importing without curves'
      )
    }

    if (trackpoints.length === 0) {
      return base
    }

    const analysis = analyze(trackpoints)

    const baseMetrics = base.sportMetrics as RunMetrics
    const enriched: RunMetrics = {
      ...baseMetrics,
      minHeartRate: analysis.minHeartRate,
      maxHeartRate: analysis.maxHeartRate ?? baseMetrics.maxHeartRate,
      cadenceAvg: analysis.cadenceAvg,
      elevationGain: analysis.elevationGain ?? baseMetrics.elevationGain,
      elevationLoss: analysis.elevationLoss,
      heartRateCurve: analysis.heartRateCurve,
      paceCurve: analysis.paceCurve,
      altitudeCurve: analysis.altitudeCurve,
      gpsTrack: analysis.gpsTrack,
      splits: analysis.splits,
    }

    // Zones, dérive et TRIMP sont calculés à l'écriture avec les zones de l'athlète
    // (ImportedSessionWriter) : le connecteur ne livre que des données brutes.
    void context

    return { ...base, sportMetrics: enriched }
  }

  async getConnectionStatus(): Promise<ConnectorStatus> {
    try {
      await this.#makeClient().get<unknown>(`${STRAVA_API_BASE}/athlete`)
      return ConnectorStatus.Connected
    } catch (error) {
      // Seule une révocation est un état d'erreur ; une panne réseau ou Strava
      // indisponible ne doit pas afficher le connecteur comme cassé
      if (error instanceof ConnectorAuthError) return ConnectorStatus.Error
      logger.warn({ err: error, userId: this.userId }, 'Strava status check failed')
      return ConnectorStatus.Connected
    }
  }

  /**
   * Revoque l'autorisation cote Strava. L'appelant est responsable de la
   * suppression locale : cette methode peut echouer (Strava indisponible, token
   * deja invalide) sans que la deconnexion locale doive en dependre.
   */
  async disconnect(): Promise<void> {
    const doFetch = this.#fetcher ?? fetch
    await doFetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: this.tokens.accessToken }),
    })
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

  #toMappedSessionData(
    raw: RawStravaDetailedSession,
    sportSlug: SportySportSlug
  ): MappedSessionData {
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

type RawStravaDetailedSession = {
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

type RawStravaSummarySession = {
  id: number
  name: string
  sport_type: string
  start_date_local: string
  moving_time: number
  distance?: number | null
  average_heartrate?: number | null
}
