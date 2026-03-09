import { test } from '@japa/runner'
import { StravaRateLimitManager } from '#connectors/rate_limit_manager'

test.group('RateLimitManager — StravaRateLimitManager', () => {
  test('AC#5 — waitIfNeeded ne bloque pas si les deux budgets sont disponibles', async ({
    assert,
  }) => {
    const manager = new StravaRateLimitManager()
    manager.update(50, 500)
    const start = Date.now()
    await manager.waitIfNeeded()
    assert.isBelow(Date.now() - start, 50, 'ne doit pas bloquer si budget disponible')
  })

  test('AC#5 — update met à jour correctement les compteurs 15min et journalier', ({ assert }) => {
    const manager = new StravaRateLimitManager()
    manager.update(42, 567)
    assert.equal(manager.usage15min, 42)
    assert.equal(manager.usageDaily, 567)
  })

  test('AC#5 — instance fraîche démarre avec usage zéro', ({ assert }) => {
    const manager = new StravaRateLimitManager()
    assert.equal(manager.usage15min, 0)
    assert.equal(manager.usageDaily, 0)
  })

  test('AC#5 — update successif écrase les valeurs précédentes', ({ assert }) => {
    const manager = new StravaRateLimitManager()
    manager.update(10, 100)
    manager.update(42, 567)
    assert.equal(manager.usage15min, 42)
    assert.equal(manager.usageDaily, 567)
  })

  test('AC#5 — waitIfNeeded bloque si le budget 15min est épuisé (vérifie que sleep est appelé)', async ({
    assert,
  }) => {
    const manager = new StravaRateLimitManager({ sleeper: async () => {} }) // sleeper injecté = pas de vraie attente
    manager.update(100, 500) // budget 15min épuisé
    let slept = false
    const fastManager = new StravaRateLimitManager({
      sleeper: async () => {
        slept = true
      },
    })
    fastManager.update(100, 500)
    await fastManager.waitIfNeeded()
    assert.isTrue(slept, 'doit appeler le sleeper si budget 15min épuisé')
  })

  test('AC#5 — waitIfNeeded bloque si le budget journalier est épuisé', async ({ assert }) => {
    let slept = false
    const manager = new StravaRateLimitManager({
      sleeper: async () => {
        slept = true
      },
    })
    manager.update(50, 1000) // budget journalier épuisé
    await manager.waitIfNeeded()
    assert.isTrue(slept, 'doit appeler le sleeper si budget journalier épuisé')
  })
})
