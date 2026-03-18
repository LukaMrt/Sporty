import { test } from '@japa/runner'
import SetSessionGpxFilePath from '#use_cases/sessions/set_session_gpx_file_path'
import { makeMockSessionRepository } from '#tests/helpers/mock_session_repository'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import type { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 1,
    userId: 42,
    sportId: 1,
    sportName: 'Course à pied',
    date: '2026-01-15',
    durationMinutes: 45,
    distanceKm: 10,
    avgHeartRate: 150,
    perceivedEffort: null,
    sportMetrics: {},
    notes: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    gpxFilePath: null,
    ...overrides,
  }
}

function makeMockGpxFileStorage(movedPath = 'storage/gpx/42/1.gpx'): GpxFileStorage {
  return {
    saveTempFile: async () => 'temp-id',
    moveTempFile: async () => movedPath,
    saveFile: async () => movedPath,
  } as unknown as GpxFileStorage
}

test.group('SetSessionGpxFilePath — use case', () => {
  test('déplace le fichier temporaire et met à jour le gpxFilePath', async ({ assert }) => {
    let updatedPath: string | null = null
    const repo = makeMockSessionRepository({
      findById: async () => makeSession(),
      update: async (_id, data) => {
        updatedPath = data.gpxFilePath as string
        return makeSession({ gpxFilePath: data.gpxFilePath as string })
      },
    })

    const useCase = new SetSessionGpxFilePath(repo, makeMockGpxFileStorage())
    await useCase.execute(1, 42, 'some-temp-id')

    assert.equal(updatedPath, 'storage/gpx/42/1.gpx')
  })

  test("lève SessionNotFoundError si la séance n'existe pas", async ({ assert }) => {
    const repo = makeMockSessionRepository({ findById: async () => null })
    const useCase = new SetSessionGpxFilePath(repo, makeMockGpxFileStorage())

    await assert.rejects(() => useCase.execute(999, 42, 'some-temp-id'), SessionNotFoundError)
  })

  test('lève SessionForbiddenError si la séance appartient à un autre utilisateur', async ({
    assert,
  }) => {
    const repo = makeMockSessionRepository({
      findById: async () => makeSession({ userId: 99 }),
    })
    const useCase = new SetSessionGpxFilePath(repo, makeMockGpxFileStorage())

    await assert.rejects(() => useCase.execute(1, 42, 'some-temp-id'), SessionForbiddenError)
  })
})
