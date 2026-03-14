import { test } from '@japa/runner'
import { SyncScheduler } from '#services/sync_scheduler'
import type { SyncFn, SyncOutcome, LoadConnectorsFn } from '#services/sync_scheduler'

function makeSyncFn(outcome: SyncOutcome = 'success'): {
  fn: SyncFn
  calls: { connectorId: number; userId: number }[]
} {
  const calls: { connectorId: number; userId: number }[] = []
  const fn: SyncFn = async (connectorId, userId) => {
    calls.push({ connectorId, userId })
    return { outcome }
  }
  return { fn, calls }
}

function makeLoadFn(
  connectors: { id: number; userId: number; pollingIntervalMinutes: number }[] = []
): LoadConnectorsFn {
  return async () => connectors
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.group('SyncScheduler', (group) => {
  let scheduler: SyncScheduler

  group.each.teardown(() => {
    scheduler?.stop()
  })

  test('start() charge les connecteurs auto-import et crée les timers', async ({ assert }) => {
    const { fn } = makeSyncFn()
    const loadFn = makeLoadFn([
      { id: 1, userId: 10, pollingIntervalMinutes: 60 },
      { id: 2, userId: 20, pollingIntervalMinutes: 30 },
    ])

    scheduler = new SyncScheduler(fn, loadFn)
    await scheduler.start()

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 2)
    // @ts-expect-error accès privé pour test
    assert.isTrue(scheduler.timers.has(1))
    // @ts-expect-error accès privé pour test
    assert.isTrue(scheduler.timers.has(2))
  })

  test('stop() nettoie tous les timers', async ({ assert }) => {
    const { fn } = makeSyncFn()
    scheduler = new SyncScheduler(
      fn,
      makeLoadFn([{ id: 1, userId: 10, pollingIntervalMinutes: 60 }])
    )
    await scheduler.start()

    scheduler.stop()

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 0)
  })

  test('addConnector() remplace un timer existant pour le même connectorId', async ({ assert }) => {
    const { fn } = makeSyncFn()
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.addConnector(1, 10, 60)
    // @ts-expect-error accès privé pour test
    const firstHandle = scheduler.timers.get(1)!.handle

    scheduler.addConnector(1, 10, 30)
    // @ts-expect-error accès privé pour test
    const secondHandle = scheduler.timers.get(1)!.handle

    assert.notStrictEqual(firstHandle, secondHandle)
    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.get(1)!.intervalMinutes, 30)
  })

  test('removeConnector() supprime le timer du connecteur', async ({ assert }) => {
    const { fn } = makeSyncFn()
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.addConnector(1, 10, 60)
    scheduler.removeConnector(1)

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 0)
  })

  test('removeConnector() ne fait rien si le connecteur est inconnu', async ({ assert }) => {
    const { fn } = makeSyncFn()
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.removeConnector(999)

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 0)
  })

  test("updateInterval() met à jour l'intervalle d'un connecteur existant", async ({ assert }) => {
    const { fn } = makeSyncFn()
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.addConnector(1, 10, 60)
    scheduler.updateInterval(1, 5)

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.get(1)!.intervalMinutes, 5)
  })

  test('updateInterval() ne fait rien si le connecteur est inconnu', async ({ assert }) => {
    const { fn } = makeSyncFn()
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.updateInterval(999, 5)

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 0)
  })

  test('un permanent_error supprime le timer après exécution', async ({ assert }) => {
    const { fn } = makeSyncFn('permanent_error')
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.addConnector(1, 10, 60)

    // Appeler runSync directement pour tester sans attendre le timer
    // @ts-expect-error accès privé pour test
    await scheduler.runSync(1, 10)

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 0)
  })

  test('un temporary_error ne supprime pas le timer', async ({ assert }) => {
    const { fn } = makeSyncFn('temporary_error')
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.addConnector(1, 10, 60)

    // @ts-expect-error accès privé pour test
    await scheduler.runSync(1, 10)

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 1)
  })

  test('un success ne supprime pas le timer', async ({ assert }) => {
    const { fn } = makeSyncFn('success')
    scheduler = new SyncScheduler(fn, makeLoadFn())

    scheduler.addConnector(1, 10, 60)

    // @ts-expect-error accès privé pour test
    await scheduler.runSync(1, 10)

    // @ts-expect-error accès privé pour test
    assert.equal(scheduler.timers.size, 1)
  })
})
