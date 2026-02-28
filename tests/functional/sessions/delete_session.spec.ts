import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser, getUser2 } from '#tests/helpers'

test.group('DELETE /sessions/:id', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('suppression soft-delete OK — deleted_at est défini (AC#2)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
    })

    const response = await client.delete(`/sessions/${session.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/sessions')

    await session.refresh()
    assert.isNotNull(session.deletedAt)
  })

  test('séance supprimée disparaît de la liste (AC#4)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
    })

    await client.delete(`/sessions/${session.id}`).loginAs(user)

    const remaining = await Session.query()
      .where('userId', user.id)
      .where('id', session.id)
      .whereNull('deletedAt')
      .first()

    assert.isNull(remaining)
  })

  test('ownership check — 403 si pas propriétaire (AC#2)', async ({ client, assert }) => {
    const owner = await getUser()
    const otherUser = await getUser2()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: owner.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
    })

    const response = await client.delete(`/sessions/${session.id}`).loginAs(otherUser).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Séance introuvable ou accès refusé')

    await session.refresh()
    assert.isNull(session.deletedAt)
  })

  test('DELETE non connecté → redirect /login', async ({ client }) => {
    const response = await client.delete('/sessions/1').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('POST /sessions/:id/restore', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('restore remet deleted_at à null (AC#3)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
    })

    // Soft-delete d'abord
    await client.delete(`/sessions/${session.id}`).loginAs(user)
    await session.refresh()
    assert.isNotNull(session.deletedAt)

    // Restore
    const response = await client.post(`/sessions/${session.id}/restore`).loginAs(user).redirects(0)

    response.assertStatus(302)

    await session.refresh()
    assert.isNull(session.deletedAt)
  })

  test('restore ownership check — 302 + flash error si pas propriétaire', async ({
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
    })

    await client.delete(`/sessions/${session.id}`).loginAs(owner)

    const response = await client
      .post(`/sessions/${session.id}/restore`)
      .loginAs(otherUser)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Séance introuvable ou accès refusé')

    await session.refresh()
    assert.isNotNull(session.deletedAt)
  })
})
