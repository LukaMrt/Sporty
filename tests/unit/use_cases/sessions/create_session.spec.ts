import { test } from '@japa/runner'
import CreateSession from '#use_cases/sessions/create_session'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import type { TrainingSession } from '#domain/entities/training_session'

type SessionData = Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>

test.group('CreateSession — use case', () => {
  test('crée une séance avec le userId injecté côté serveur', async ({ assert }) => {
    let capturedData: SessionData | null = null
    const repo = makeMockSessionRepository({
      create: async (data) => {
        capturedData = data
        return { id: 1, sportName: 'Course à pied', createdAt: new Date().toISOString(), ...data }
      },
    })

    const useCase = new CreateSession(repo)
    const result = await useCase.execute(42, {
      sportId: 1,
      date: '2026-02-25',
      durationMinutes: 45,
    })

    assert.equal(result.id, 1)
    assert.equal(result.userId, 42)
    assert.equal(result.sportId, 1)
    assert.equal(result.date, '2026-02-25')
    assert.equal(result.durationMinutes, 45)
    assert.isNotNull(capturedData)
    assert.equal(capturedData!.userId, 42)
  })

  test("le userId provient du paramètre serveur, pas de l'input", async ({ assert }) => {
    let capturedUserId = 0
    const repo = makeMockSessionRepository({
      create: async (data) => {
        capturedUserId = data.userId
        return { id: 1, sportName: '', createdAt: '', ...data }
      },
    })

    const useCase = new CreateSession(repo)
    await useCase.execute(99, {
      sportId: 1,
      date: '2026-01-01',
      durationMinutes: 60,
    })

    assert.equal(capturedUserId, 99)
  })

  test('les champs optionnels sont null par défaut', async ({ assert }) => {
    let capturedData: SessionData | null = null
    const repo = makeMockSessionRepository({
      create: async (data) => {
        capturedData = data
        return { id: 1, sportName: '', createdAt: '', ...data }
      },
    })

    const useCase = new CreateSession(repo)
    await useCase.execute(1, {
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

  test("les champs optionnels sont transmis correctement s'ils sont fournis", async ({
    assert,
  }) => {
    let capturedData: SessionData | null = null
    const repo = makeMockSessionRepository({
      create: async (data) => {
        capturedData = data
        return { id: 1, sportName: '', createdAt: '', ...data }
      },
    })

    const useCase = new CreateSession(repo)
    await useCase.execute(1, {
      sportId: 2,
      date: '2026-02-25',
      durationMinutes: 45,
      distanceKm: 10.5,
      avgHeartRate: 145,
      perceivedEffort: 4,
      notes: 'Belle sortie',
      sportMetrics: { elevation_gain: 200 },
    })

    assert.equal(capturedData!.sportId, 2)
    assert.equal(capturedData!.distanceKm, 10.5)
    assert.equal(capturedData!.avgHeartRate, 145)
    assert.equal(capturedData!.perceivedEffort, 4)
    assert.equal(capturedData!.notes, 'Belle sortie')
    assert.deepEqual(capturedData!.sportMetrics, { elevation_gain: 200 })
  })
})
