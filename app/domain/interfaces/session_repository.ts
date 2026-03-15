import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

export type ListSessionsOptions = {
  page?: number
  perPage?: number
  sportId?: number
  sortBy?: 'date' | 'duration_minutes' | 'distance_km'
  sortOrder?: 'asc' | 'desc'
}

export interface SessionExternalRef {
  externalId: string
  id: number
}

export abstract class SessionRepository {
  abstract create(
    data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>
  ): Promise<TrainingSession>
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
  abstract findTrashedByUserId(userId: number): Promise<TrainingSession[]>
  abstract softDelete(id: number): Promise<void>
  abstract restore(id: number): Promise<void>
  abstract findByUserIdAndDateRange(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<TrainingSession[]>
  abstract findByUserAndExternalIds(
    userId: number,
    externalIds: string[]
  ): Promise<SessionExternalRef[]>
}
