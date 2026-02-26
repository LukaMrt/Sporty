import { test } from '@japa/runner'
import GetSession from '#use_cases/sessions/get_session'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import type { TrainingSession } from '#domain/entities/training_session'

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 1,
    userId: 42,
    sportId: 1,
    sportName: 'Course à pied',
    date: '2026-02-25',
    durationMinutes: 45,
    distanceKm: 10,
    avgHeartRate: 150,
    perceivedEffort: 3,
    sportMetrics: {},
    notes: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

test.group('GetSession — use case', () => {
  test('retourne la seance si elle appartient a lutilisateur', async ({ assert }) => {
    const session = makeSession({ id: 5, userId: 42 })
    const repo = makeMockSessionRepository({
      async findById(id) {
        assert.equal(id, 5)
        return session
      },
    })

    const useCase = new GetSession(repo)
    const result = await useCase.execute(5, 42)

    assert.deepEqual(result, session)
  })

  test('leve SessionNotFoundError si la seance nexiste pas', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      async findById() {
        return null
      },
    })

    const useCase = new GetSession(repo)

    try {
      await useCase.execute(99, 42)
      assert.fail('Devrait lever SessionNotFoundError')
    } catch (error) {
      assert.instanceOf(error, SessionNotFoundError)
    }
  })

  test('leve SessionForbiddenError si la seance appartient a un autre utilisateur', async ({
    assert,
  }) => {
    const session = makeSession({ id: 1, userId: 10 })
    const repo = makeMockSessionRepository({
      async findById() {
        return session
      },
    })

    const useCase = new GetSession(repo)

    try {
      await useCase.execute(1, 42)
      assert.fail('Devrait lever SessionForbiddenError')
    } catch (error) {
      assert.instanceOf(error, SessionForbiddenError)
    }
  })
})
