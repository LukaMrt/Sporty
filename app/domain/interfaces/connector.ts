import type { ConnectorStatus } from '#domain/value_objects/connector_status'

export interface ConnectorTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface ActivityFilters {
  after?: Date
  before?: Date
  perPage?: number
}

export interface ActivitySummary {
  externalId: string
  name: string
  sportType: string
  startDate: string
  durationSeconds: number
  distanceMeters: number | null
  averageHeartRate: number | null
}

export interface ActivityDetail extends ActivitySummary {
  metrics: Record<string, unknown>
  notes: string | null
}

export abstract class Connector {
  abstract readonly id: number
  abstract authenticate(): Promise<ConnectorTokens>
  abstract listActivities(filters: ActivityFilters): Promise<ActivitySummary[]>
  abstract getActivityDetail(externalId: string): Promise<ActivityDetail>
  abstract getConnectionStatus(): Promise<ConnectorStatus>
  abstract disconnect(): Promise<void>
}
