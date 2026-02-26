import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

export abstract class SessionRepository {
  abstract create(
    data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>
  ): Promise<TrainingSession>
  abstract findAllByUserId(
    userId: number,
    opts?: { page?: number; perPage?: number }
  ): Promise<PaginatedResult<TrainingSession>>
  abstract findById(id: number): Promise<TrainingSession | null>
  abstract findByIdIncludingTrashed(id: number): Promise<TrainingSession | null>
  abstract update(
    id: number,
    data: Partial<Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>>
  ): Promise<TrainingSession>
  abstract softDelete(id: number): Promise<void>
  abstract restore(id: number): Promise<void>
}
