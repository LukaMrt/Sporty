import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import type { SportMetrics } from '#domain/value_objects/sport_metrics'
import type { HrZonesConfig } from '#domain/value_objects/heart_rate_zones_config'
import type { DailyWellness } from '#domain/value_objects/daily_wellness'

export type ConnectorTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export type SessionFilters = {
  after?: Date
  before?: Date
  perPage?: number
}

export type MappingContext = {
  maxHeartRate?: number
  restingHeartRate?: number
  /** Zones choisies par l'athlète (absent = auto) */
  hrZonesConfig?: HrZonesConfig
}

export type MappedSessionSummary = {
  externalId: string
  name: string
  sportSlug: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
}

export type MappedSessionData = {
  sportSlug: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  importedFrom: string
  externalId: string
  sportMetrics: SportMetrics
  /** Effort (1–5) fourni par la source, ex. score d'effort de la montre */
  perceivedEffort?: number | null
}

export abstract class Connector {
  abstract readonly id: number
  abstract listSessions(filters: SessionFilters): Promise<MappedSessionSummary[]>
  abstract getSessionDetail(
    externalId: string,
    context?: MappingContext
  ): Promise<MappedSessionData>
  abstract getConnectionStatus(): Promise<ConnectorStatus>
  abstract disconnect(): Promise<void>

  /**
   * Capacité optionnelle : métriques quotidiennes de récupération (FC repos,
   * HRV, sommeil, poids…). Par défaut, le connecteur n'en fournit pas.
   */
  supportsWellness(): boolean {
    return false
  }

  async listDailyWellness(_from: Date, _to: Date): Promise<DailyWellness[]> {
    return []
  }
}
