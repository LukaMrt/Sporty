import type { SportMetrics } from '#domain/value_objects/sport_metrics'

export interface TrainingSession {
  id: number
  userId: number
  sportId: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  perceivedEffort: number | null
  sportMetrics: SportMetrics
  notes: string | null
  importedFrom?: string | null
  externalId?: string | null
  gpxFilePath?: string | null
  createdAt: string
  deletedAt?: string | null
}
