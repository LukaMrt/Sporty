import { test } from '@japa/runner'
import UpdateSession from '#use_cases/sessions/update_session'
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

test.group('UpdateSession — use case', () => {
  test('mise à jour réussie — retourne la séance mise à jour', async ({ assert }) => {
    let capturedId = 0
    let capturedData: Partial<
      Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>
    > | null = null

    const repo = makeMockSessionRepository({
      findById: async () => ({ ...BASE_SESSION }),
      update: async (id, data) => {
        capturedId = id
        capturedData = data
        return { ...BASE_SESSION, ...data }
      },
    })

    const useCase = new UpdateSession(repo)
    const result = await useCase.execute(1, 42, {
      sportId: 1,
      date: '2026-02-26',
      durationMinutes: 60,
      distanceKm: 10,
    })

    assert.equal(capturedId, 1)
    assert.equal(capturedData!.date, '2026-02-26')
    assert.equal(capturedData!.durationMinutes, 60)
    assert.equal(capturedData!.distanceKm, 10)
    assert.equal(result.durationMinutes, 60)
  })

  test('séance inexistante → SessionNotFoundError', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      findById: async () => null,
    })

    const useCase = new UpdateSession(repo)

    try {
      await useCase.execute(999, 42, {
        sportId: 1,
        date: '2026-02-25',
        durationMinutes: 30,
      })
      assert.fail('Devrait lever une erreur')
    } catch (error) {
      assert.instanceOf(error, SessionNotFoundError)
    }
  })

  test('séance appartenant à un autre user → SessionForbiddenError', async ({ assert }) => {
    const repo = makeMockSessionRepository({
      findById: async () => ({ ...BASE_SESSION, userId: 99 }),
    })

    const useCase = new UpdateSession(repo)

    try {
      await useCase.execute(1, 42, {
        sportId: 1,
        date: '2026-02-25',
        durationMinutes: 30,
      })
      assert.fail('Devrait lever une erreur')
    } catch (error) {
      assert.instanceOf(error, SessionForbiddenError)
    }
  })

  test('distance modifiée correctement — 5 km → 15 km', async ({ assert }) => {
    let capturedData: Partial<
      Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>
    > | null = null

    const repo = makeMockSessionRepository({
      findById: async () => ({ ...BASE_SESSION, distanceKm: 5 }),
      update: async (_id, data) => {
        capturedData = data
        return { ...BASE_SESSION, ...data }
      },
    })

    const useCase = new UpdateSession(repo)
    const result = await useCase.execute(1, 42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 45,
      distanceKm: 15,
    })

    assert.equal(capturedData!.distanceKm, 15)
    assert.equal(result.distanceKm, 15)
  })

  test('champs optionnels non fournis → null par défaut', async ({ assert }) => {
    let capturedData: Partial<
      Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>
    > | null = null

    const repo = makeMockSessionRepository({
      findById: async () => ({ ...BASE_SESSION }),
      update: async (_id, data) => {
        capturedData = data
        return { ...BASE_SESSION, ...data }
      },
    })

    const useCase = new UpdateSession(repo)
    await useCase.execute(1, 42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 30,
    })

    assert.isNull(capturedData!.distanceKm)
    assert.isNull(capturedData!.avgHeartRate)
    assert.isNull(capturedData!.perceivedEffort)
    assert.isNull(capturedData!.notes)
    assert.deepEqual(capturedData!.sportMetrics, {})
  })
})
