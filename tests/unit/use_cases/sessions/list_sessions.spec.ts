import { test } from '@japa/runner'
import ListSessions from '#use_cases/sessions/list_sessions'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 1,
    userId: 1,
    sportId: 1,
    sportName: 'Course a pied',
    date: '2026-02-25',
    durationMinutes: 45,
    distanceKm: null,
    avgHeartRate: null,
    perceivedEffort: null,
    sportMetrics: {},
    notes: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

test.group('ListSessions — use case', () => {
  test('retourne les seances paginées de utilisateur', async ({ assert }) => {
    const sessions = [makeSession({ id: 1 }), makeSession({ id: 2 })]
    const repo = makeMockSessionRepository({
      async findAllByUserId(userId, opts) {
        assert.equal(userId, 42)
        return {
          data: sessions,
          meta: { total: 2, page: opts?.page ?? 1, perPage: opts?.perPage ?? 20, lastPage: 1 },
        }
      },
    })

    const useCase = new ListSessions(repo)
    const result = await useCase.execute(42)

    assert.equal(result.data.length, 2)
    assert.equal(result.meta.total, 2)
    assert.equal(result.meta.page, 1)
    assert.equal(result.meta.perPage, 20)
    assert.equal(result.meta.lastPage, 1)
  })

  test("retourne une liste vide si l'utilisateur n'a aucune seance", async ({ assert }) => {
    const repo = makeMockSessionRepository({
      async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
        return { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 } }
      },
    })

    const useCase = new ListSessions(repo)
    const result = await useCase.execute(99)

    assert.equal(result.data.length, 0)
    assert.equal(result.meta.total, 0)
  })

  test('transmet les parametres de pagination au repository', async ({ assert }) => {
    let capturedPage: number | undefined
    let capturedPerPage: number | undefined

    const repo = makeMockSessionRepository({
      async findAllByUserId(_userId, opts) {
        capturedPage = opts?.page
        capturedPerPage = opts?.perPage
        return {
          data: [],
          meta: { total: 0, page: opts?.page ?? 1, perPage: opts?.perPage ?? 20, lastPage: 1 },
        }
      },
    })

    const useCase = new ListSessions(repo)
    await useCase.execute(1, 3, 10)

    assert.equal(capturedPage, 3)
    assert.equal(capturedPerPage, 10)
  })

  test("n'expose que les seances de l'utilisateur demande", async ({ assert }) => {
    let capturedUserId = 0

    const repo = makeMockSessionRepository({
      async findAllByUserId(userId) {
        capturedUserId = userId
        return { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 1 } }
      },
    })

    const useCase = new ListSessions(repo)
    await useCase.execute(7)

    assert.equal(capturedUserId, 7)
  })
})
