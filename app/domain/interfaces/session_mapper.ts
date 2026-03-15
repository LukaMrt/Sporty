import type { SessionDetail } from '#domain/interfaces/connector'

export interface MappedSessionData {
  sportSlug: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  importedFrom: string
  externalId: string
  sportMetrics: Record<string, unknown>
}

export abstract class SessionMapper {
  abstract map(detail: SessionDetail): MappedSessionData
}
