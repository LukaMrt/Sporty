import type { ConnectorStatus } from '#domain/value_objects/connector_status'

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

export interface SessionSummary {
  externalId: string
  name: string
  sportType: string
  startDate: string
  durationSeconds: number
  distanceMeters: number | null
  averageHeartRate: number | null
}

export interface SessionDetail extends SessionSummary {
  metrics: Record<string, unknown>
  notes: string | null
}

export abstract class Connector {
  abstract readonly id: number
  abstract authenticate(): Promise<ConnectorTokens>
  abstract listSessions(filters: SessionFilters): Promise<SessionSummary[]>
  abstract getSessionDetail(externalId: string): Promise<SessionDetail>
  abstract getConnectionStatus(): Promise<ConnectorStatus>
  abstract disconnect(): Promise<void>
}
