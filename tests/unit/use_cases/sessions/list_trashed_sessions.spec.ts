import { test } from '@japa/runner'
import ListTrashedSessions from '#use_cases/sessions/list_trashed_sessions'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import type { TrainingSession } from '#domain/entities/training_session'

function makeTrashedSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 1,
    userId: 1,
    sportId: 1,
    sportName: 'Course à pied',
    date: '2026-01-10',
    durationMinutes: 45,
    distanceKm: null,
    avgHeartRate: null,
    perceivedEffort: null,
    sportMetrics: {},
    notes: null,
    createdAt: new Date().toISOString(),
    deletedAt: '2026-02-01T10:00:00.000Z',
    ...overrides,
  }
}

test.group('ListTrashedSessions — use case', () => {
  test("retourne les séances supprimées de l'utilisateur", async ({ assert }) => {
    const sessions = [makeTrashedSession({ id: 1 }), makeTrashedSession({ id: 2 })]
    const repo = makeMockSessionRepository({
      async findTrashedByUserId(userId) {
        assert.equal(userId, 42)
        return sessions
      },
    })

    const useCase = new ListTrashedSessions(repo)
    const result = await useCase.execute(42)

    assert.equal(result.length, 2)
    assert.equal(result[0].id, 1)
    assert.equal(result[1].id, 2)
  })

  test('retourne une liste vide si aucune séance supprimée', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      async findTrashedByUserId(): Promise<TrainingSession[]> {
        return []
      },
    })

    const useCase = new ListTrashedSessions(repo)
    const result = await useCase.execute(99)

    assert.equal(result.length, 0)
  })

  test('les séances retournées ont un deletedAt non null', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      async findTrashedByUserId(): Promise<TrainingSession[]> {
        return [makeTrashedSession({ deletedAt: '2026-02-01T10:00:00.000Z' })]
      },
    })

    const useCase = new ListTrashedSessions(repo)
    const result = await useCase.execute(1)

    assert.isNotNull(result[0].deletedAt)
  })

  test("n'expose que les séances de l'utilisateur demandé", async ({ assert }) => {
    let capturedUserId = 0
    const repo = makeMockSessionRepository({
      async findTrashedByUserId(userId): Promise<TrainingSession[]> {
        capturedUserId = userId
        return []
      },
    })

    const useCase = new ListTrashedSessions(repo)
    await useCase.execute(7)

    assert.equal(capturedUserId, 7)
  })
})
