import { test } from '@japa/runner'
import RestoreSession from '#use_cases/sessions/restore_session'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

const BASE_SESSION: TrainingSession = {
  id: 1,
  userId: 42,
  sportId: 1,
  sportName: 'Course à pied',
  date: '2026-02-25',
  durationMinutes: 45,
  distanceKm: 5,
  avgHeartRate: null,
  perceivedEffort: null,
  sportMetrics: {},
  notes: null,
  createdAt: '2026-02-25T10:00:00.000Z',
}

test.group('RestoreSession — use case', () => {
  test('restauration réussie — appelle restore avec le bon id', async ({ assert }) => {
    let capturedId = 0

    const repo = makeMockSessionRepository({
      findByIdIncludingTrashed: async () => ({ ...BASE_SESSION }),
      restore: async (id) => {
        capturedId = id
      },
    })

    const useCase = new RestoreSession(repo)
    await useCase.execute(1, 42)

    assert.equal(capturedId, 1)
  })

  test('séance inexistante → SessionNotFoundError', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      findByIdIncludingTrashed: async () => null,
    })

    const useCase = new RestoreSession(repo)

    try {
      await useCase.execute(999, 42)
      assert.fail('Devrait lever une erreur')
    } catch (error) {
      assert.instanceOf(error, SessionNotFoundError)
    }
  })

  test('séance appartenant à un autre user → SessionForbiddenError', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      findByIdIncludingTrashed: async () => ({ ...BASE_SESSION, userId: 99 }),
    })

    const useCase = new RestoreSession(repo)

    try {
      await useCase.execute(1, 42)
      assert.fail('Devrait lever une erreur')
    } catch (error) {
      assert.instanceOf(error, SessionForbiddenError)
    }
  })
})
