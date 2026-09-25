import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser } from '#tests/helpers'

test.group('Sessions / Natation', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  test('POST /sessions natation → lieu et bassin enregistrés', async ({ client, assert }) => {
    const user = await getUser()
    const swimming = await Sport.findByOrFail('slug', 'swimming')

    await client
      .post('/sessions')
      .form({
        sport_id: swimming.id,
        date: '2026-09-20',
        duration_minutes: 30,
        distance_km: 1.5,
        sub_type: 'pool',
        pool_length_m: 25,
      })
      .loginAs(user)
      .redirects(0)

    const session = await Session.query()
      .where('userId', user.id)
      .where('sportId', swimming.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    const metrics = session.sportMetrics as Record<string, unknown>
    assert.equal(metrics.subType, 'pool')
    assert.equal(metrics.poolLengthM, 25)
  })

  test('POST /sessions — lieu inconnu refusé', async ({ client, assert }) => {
    const user = await getUser()
    const swimming = await Sport.findByOrFail('slug', 'swimming')

    await client
      .post('/sessions')
      .form({ sport_id: swimming.id, date: '2026-09-20', duration_minutes: 30, sub_type: 'lake' })
      .loginAs(user)
      .redirects(0)

    const count = await Session.query().where('userId', user.id).where('sportId', swimming.id)
    assert.lengthOf(count, 0)
  })

  test('PUT /sessions/:id sans champs natation → sous-type existant conservé', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const running = await Sport.findByOrFail('slug', 'running')
    const session = await Session.create({
      userId: user.id,
      sportId: running.id,
      date: DateTime.fromISO('2026-09-20'),
      durationMinutes: 60,
      sportMetrics: { subType: 'trail' },
    })

    await client
      .put(`/sessions/${session.id}`)
      .form({ sport_id: running.id, date: '2026-09-20', duration_minutes: 62 })
      .loginAs(user)
      .redirects(0)

    await session.refresh()
    assert.equal((session.sportMetrics as Record<string, unknown>).subType, 'trail')
  })
})
