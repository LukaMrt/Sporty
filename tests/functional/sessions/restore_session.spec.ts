import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser, getUser2 } from '#tests/helpers'

test.group('POST /sessions/:id/restore', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('restore remet deleted_at à null (AC#1)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
      deletedAt: DateTime.now(),
    })

    const response = await client.post(`/sessions/${session.id}/restore`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/sessions/trash')

    await session.refresh()
    assert.isNull(session.deletedAt)
  })

  test('séance réapparaît dans la liste principale après restore (AC#1)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-20'),
      durationMinutes: 60,
      deletedAt: DateTime.now(),
    })

    await client.post(`/sessions/${session.id}/restore`).loginAs(user)

    const active = await Session.query()
      .where('userId', user.id)
      .where('id', session.id)
      .whereNull('deletedAt')
      .first()

    assert.isNotNull(active)
  })

  test('séance disparaît de la corbeille après restore (AC#1)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-15'),
      durationMinutes: 30,
      deletedAt: DateTime.now(),
    })

    await client.post(`/sessions/${session.id}/restore`).loginAs(user)

    const stillTrashed = await Session.query()
      .where('userId', user.id)
      .where('id', session.id)
      .whereNotNull('deletedAt')
      .first()

    assert.isNull(stillTrashed)
  })

  test('ownership check — 302 + flash error si pas propriétaire (AC#1)', async ({
    client,
    assert,
  }) => {
    const owner = await getUser()
    const otherUser = await getUser2()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: owner.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
      deletedAt: DateTime.now(),
    })

    const response = await client
      .post(`/sessions/${session.id}/restore`)
      .loginAs(otherUser)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Séance introuvable ou accès refusé')

    await session.refresh()
    assert.isNotNull(session.deletedAt)
  })

  test('séance introuvable — 302 + flash error (AC#1)', async ({ client }) => {
    const user = await getUser()

    const response = await client.post('/sessions/99999/restore').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Séance introuvable ou accès refusé')
  })

  test('non connecté → redirect /login', async ({ client }) => {
    const response = await client.post('/sessions/1/restore').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
