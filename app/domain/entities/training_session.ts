import type { SportMetrics } from '#domain/value_objects/sport_metrics'
import type { TrainingLoadMethod } from '#domain/value_objects/training_load'
import type { SessionAnalysis } from '#domain/value_objects/session_analysis'

export interface TrainingSession {
  id: number
  userId: number
  sportId: number
  sportName: string
  /** Slug du sport (running, cycling…) ; absent sur les objets construits à la main */
  sportSlug?: string
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
  /** TSS calculé et stocké (null = pas encore calculé) */
  trainingLoad?: number | null
  loadMethod?: TrainingLoadMethod | null
  /** Indicateurs d'analyse calculés à l'écriture */
  analysis?: SessionAnalysis | null
}
