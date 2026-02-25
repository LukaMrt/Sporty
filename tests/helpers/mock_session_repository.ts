import { SessionRepository } from '#domain/interfaces/session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

export function makeMockSessionRepository(
  overrides: Partial<SessionRepository> = {}
): SessionRepository {
  class MockRepository extends SessionRepository {
    async create(
      data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>
    ): Promise<TrainingSession> {
      return {
        id: 1,
        sportName: 'Course à pied',
        createdAt: new Date().toISOString(),
        ...data,
      }
    }

    async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
      return { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 } }
    }

    async findById(): Promise<null> {
      return null
    }

    async update(): Promise<TrainingSession> {
      return {
        id: 1,
        userId: 1,
        sportId: 1,
        sportName: '',
        date: '',
        durationMinutes: 0,
        distanceKm: null,
        avgHeartRate: null,
        perceivedEffort: null,
        sportMetrics: {},
        notes: null,
        createdAt: '',
      }
    }

    async softDelete(): Promise<void> {}

    async restore(): Promise<void> {}
  }

  return Object.assign(new MockRepository(), overrides)
}
