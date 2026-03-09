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
  sportMetrics: Record<string, unknown>
  notes: string | null
  importedFrom?: string | null
  externalId?: string | null
  createdAt: string
  deletedAt?: string | null
}
