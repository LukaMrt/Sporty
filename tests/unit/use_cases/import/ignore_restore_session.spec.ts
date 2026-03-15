import { test } from '@japa/runner'
import IgnoreSession from '#use_cases/import/ignore_session'
import RestoreSession from '#use_cases/import/restore_session'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type {
  StagingSessionInput,
  StagingSessionRecord,
  ImportedSessionRef,
} from '#domain/interfaces/import_session_repository'

// ─── Mock ────────────────────────────────────────────────────────────────────

function makeImportSessionRepository(
  overrides: Partial<ImportSessionRepository> = {}
): ImportSessionRepository {
  class Mock extends ImportSessionRepository {
    async upsertMany(_connectorId: number, _sessions: StagingSessionInput[]): Promise<void> {}
    async findByConnectorId(): Promise<StagingSessionRecord[]> {
      return []
    }
    async findByIds(): Promise<StagingSessionRecord[]> {
      return []
    }
    async setImported(): Promise<void> {}
    async setIgnored(): Promise<void> {}
    async setNew(): Promise<void> {}
    async setFailed(): Promise<void> {}
    async markImportedBulk(_connectorId: number, _refs: ImportedSessionRef[]): Promise<void> {}
  }
  return Object.assign(new Mock(), overrides)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('IgnoreSession', () => {
  test('appelle setIgnored avec le bon id (AC#1)', async ({ assert }) => {
    const calls: number[] = []
    const repo = makeImportSessionRepository({
      setIgnored: async (id: number) => {
        calls.push(id)
      },
    })

    const useCase = new IgnoreSession(repo)
    await useCase.execute({ id: 42, userId: 1 })

    assert.deepEqual(calls, [42])
  })

  test('ne lance pas d erreur si setIgnored resout normalement', async ({ assert }) => {
    const repo = makeImportSessionRepository()
    const useCase = new IgnoreSession(repo)
    await assert.doesNotReject(() => useCase.execute({ id: 1, userId: 1 }))
  })

  test('propage les erreurs du repository', async ({ assert }) => {
    const repo = makeImportSessionRepository({
      setIgnored: async () => {
        throw new Error('DB error')
      },
    })
    const useCase = new IgnoreSession(repo)

    try {
      await useCase.execute({ id: 1, userId: 1 })
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
    }
  })
})

test.group('RestoreSession', () => {
  test('appelle setNew avec le bon id (AC#2)', async ({ assert }) => {
    const calls: number[] = []
    const repo = makeImportSessionRepository({
      setNew: async (id: number) => {
        calls.push(id)
      },
    })

    const useCase = new RestoreSession(repo)
    await useCase.execute({ id: 7, userId: 1 })

    assert.deepEqual(calls, [7])
  })

  test('ne lance pas d erreur si setNew resout normalement', async ({ assert }) => {
    const repo = makeImportSessionRepository()
    const useCase = new RestoreSession(repo)
    await assert.doesNotReject(() => useCase.execute({ id: 5, userId: 1 }))
  })

  test('propage les erreurs du repository', async ({ assert }) => {
    const repo = makeImportSessionRepository({
      setNew: async () => {
        throw new Error('DB error')
      },
    })
    const useCase = new RestoreSession(repo)

    try {
      await useCase.execute({ id: 1, userId: 1 })
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
    }
  })
})
