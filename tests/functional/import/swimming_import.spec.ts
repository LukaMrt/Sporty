import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import ImportedSessionWriter from '#use_cases/import/imported_session_writer'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { getUser } from '#tests/helpers'

test.group('Import / Natation', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  test('le sport natation existe en base', async ({ assert }) => {
    const sportRepository = await app.container.make(SportRepository)
    const sports = await sportRepository.findAll()
    assert.exists(sports.find((s) => s.slug === 'swimming'))
  })

  test("une séance de natation importée n'est plus rejetée", async ({ assert }) => {
    const user = await getUser()
    const sportRepository = await app.container.make(SportRepository)
    const sports = await sportRepository.findAll()
    const writer = await app.container.make(ImportedSessionWriter)

    const result = await writer.write(
      user.id,
      {
        sportSlug: 'swimming',
        date: '2026-09-20',
        durationMinutes: 30,
        distanceKm: 1.5,
        avgHeartRate: 130,
        importedFrom: 'open-wearables',
        externalId: 'ow-swim-test',
        sportMetrics: { allure: 2, subType: 'pool' },
      },
      sports,
      null
    )

    assert.equal(result.kind, 'created')
    if (result.kind !== 'created') return
    assert.equal(result.session.sportSlug, 'swimming')
    assert.equal((result.session.sportMetrics as Record<string, unknown>).subType, 'pool')
  })
})
