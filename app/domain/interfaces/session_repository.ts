import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'
import type { TrainingLoadMethod } from '#domain/value_objects/training_load'

export type ListSessionsOptions = {
  page?: number
  perPage?: number
  sportId?: number
  sortBy?: 'date' | 'duration_minutes' | 'distance_km'
  sortOrder?: 'asc' | 'desc'
}

/** Vue légère d'une séance pour les calculs de charge (sans le JSONB sport_metrics) */
export interface SessionLoadEntry {
  id: number
  date: string
  sportSlug: string
  durationMinutes: number
  distanceKm: number | null
  trainingLoad: number | null
  loadMethod: TrainingLoadMethod | null
}

export interface SessionExternalRef {
  externalId: string
  id: number
}

export abstract class SessionRepository {
  abstract create(
    data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>
  ): Promise<TrainingSession>
  /** Liste paginée — sans `sportMetrics` (vide) pour ne pas charger les courbes */
  abstract findAllByUserId(
    userId: number,
    opts?: ListSessionsOptions
  ): Promise<PaginatedResult<TrainingSession>>
  abstract findById(id: number): Promise<TrainingSession | null>
  abstract findByIdIncludingTrashed(id: number): Promise<TrainingSession | null>
  abstract update(
    id: number,
    data: Partial<Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>>
  ): Promise<TrainingSession>
  /** Sans `sportMetrics` (vide) */
  abstract findTrashedByUserId(userId: number): Promise<TrainingSession[]>
  abstract softDelete(id: number): Promise<void>
  abstract restore(id: number): Promise<void>
  /** Sans `sportMetrics` (vide) : utiliser findByIds pour les séances complètes */
  abstract findByUserIdAndDateRange(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<TrainingSession[]>
  abstract findByUserAndExternalIds(
    userId: number,
    externalIds: string[]
  ): Promise<SessionExternalRef[]>
  abstract forceDelete(id: number): Promise<void>
  /** Séances non supprimées entre deux dates, colonnes légères uniquement */
  abstract findLoadEntries(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<SessionLoadEntry[]>
  abstract findByIds(ids: number[]): Promise<TrainingSession[]>
  /** Toutes les séances non supprimées d'un utilisateur (recalculs en lot) */
  abstract findAllAliveByUserId(userId: number): Promise<TrainingSession[]>
}
