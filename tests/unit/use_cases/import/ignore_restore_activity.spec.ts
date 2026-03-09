import { test } from '@japa/runner'
import IgnoreActivity from '#use_cases/import/ignore_activity'
import RestoreActivity from '#use_cases/import/restore_activity'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type {
  StagingActivityInput,
  StagingActivityRecord,
} from '#domain/interfaces/import_activity_repository'

// ─── Mock ────────────────────────────────────────────────────────────────────

function makeImportActivityRepository(
  overrides: Partial<ImportActivityRepository> = {}
): ImportActivityRepository {
  class Mock extends ImportActivityRepository {
    async upsertMany(_connectorId: number, _activities: StagingActivityInput[]): Promise<void> {}
    async findByConnectorId(): Promise<StagingActivityRecord[]> {
      return []
    }
    async findByIds(): Promise<StagingActivityRecord[]> {
      return []
    }
    async setImported(): Promise<void> {}
    async setIgnored(): Promise<void> {}
    async setNew(): Promise<void> {}
  }
  return Object.assign(new Mock(), overrides)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('IgnoreActivity', () => {
  test('appelle setIgnored avec le bon id (AC#1)', async ({ assert }) => {
    const calls: number[] = []
    const repo = makeImportActivityRepository({
      setIgnored: async (id) => {
        calls.push(id)
      },
    })

    const useCase = new IgnoreActivity(repo)
    await useCase.execute({ id: 42 })

    assert.deepEqual(calls, [42])
  })

  test('ne lance pas d erreur si setIgnored resout normalement', async ({ assert }) => {
    const repo = makeImportActivityRepository()
    const useCase = new IgnoreActivity(repo)
    await assert.doesNotReject(() => useCase.execute({ id: 1 }))
  })

  test('propage les erreurs du repository', async ({ assert }) => {
    const repo = makeImportActivityRepository({
      setIgnored: async () => {
        throw new Error('DB error')
      },
    })
    const useCase = new IgnoreActivity(repo)

    try {
      await useCase.execute({ id: 1 })
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
    }
  })
})

test.group('RestoreActivity', () => {
  test('appelle setNew avec le bon id (AC#2)', async ({ assert }) => {
    const calls: number[] = []
    const repo = makeImportActivityRepository({
      setNew: async (id) => {
        calls.push(id)
      },
    })

    const useCase = new RestoreActivity(repo)
    await useCase.execute({ id: 7 })

    assert.deepEqual(calls, [7])
  })

  test('ne lance pas d erreur si setNew resout normalement', async ({ assert }) => {
    const repo = makeImportActivityRepository()
    const useCase = new RestoreActivity(repo)
    await assert.doesNotReject(() => useCase.execute({ id: 5 }))
  })

  test('propage les erreurs du repository', async ({ assert }) => {
    const repo = makeImportActivityRepository({
      setNew: async () => {
        throw new Error('DB error')
      },
    })
    const useCase = new RestoreActivity(repo)

    try {
      await useCase.execute({ id: 1 })
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
    }
  })
})
