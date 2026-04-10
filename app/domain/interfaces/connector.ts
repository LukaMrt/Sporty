import type { ConnectorStatus } from '#domain/value_objects/connector_status'
import type { SportMetrics } from '#domain/value_objects/sport_metrics'

export interface ConnectorTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface SessionFilters {
  after?: Date
  before?: Date
  perPage?: number
}

export interface MappingContext {
  maxHeartRate?: number
  restingHeartRate?: number
}

export interface MappedSessionSummary {
  externalId: string
  name: string
  sportSlug: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
}

export interface MappedSessionData {
  sportSlug: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  importedFrom: string
  externalId: string
  sportMetrics: SportMetrics
}

export abstract class Connector {
  abstract readonly id: number
  abstract authenticate(): Promise<ConnectorTokens>
  abstract listSessions(filters: SessionFilters): Promise<MappedSessionSummary[]>
  abstract getSessionDetail(
    externalId: string,
    context?: MappingContext
  ): Promise<MappedSessionData>
  abstract getConnectionStatus(): Promise<ConnectorStatus>
  abstract disconnect(): Promise<void>
}
