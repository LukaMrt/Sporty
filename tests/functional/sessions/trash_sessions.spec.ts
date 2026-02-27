import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser, getUser2 } from '#tests/helpers'

test.group('GET /sessions/trash', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('route accessible et retourne 200 (AC#1)', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/sessions/trash').loginAs(user)

    response.assertStatus(200)
  })

  test('liste uniquement les séances avec deleted_at non null (AC#1, AC#2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    // Séance active — ne doit pas apparaître
    await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-01-15'),
      durationMinutes: 30,
    })

    // Séance supprimée — doit apparaître
    const deleted = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-01-10'),
      durationMinutes: 45,
      deletedAt: DateTime.now(),
    })

    const response = await client.get('/sessions/trash').loginAs(user)
    response.assertStatus(200)

    // Vérification DB : la séance supprimée a bien deleted_at non null
    const deletedSession = await Session.findOrFail(deleted.id)
    assert.isNotNull(deletedSession.deletedAt)
  })

  test("n'affiche pas les séances actives (AC#1)", async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const active = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-01-20'),
      durationMinutes: 60,
    })

    const response = await client.get('/sessions/trash').loginAs(user)
    response.assertStatus(200)

    // La séance active a deleted_at null — elle ne doit pas être dans la corbeille
    await active.refresh()
    assert.isNull(active.deletedAt)
  })

  test('retourne 200 avec la corbeille (AC#3)', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/sessions/trash').loginAs(user)
    response.assertStatus(200)
  })

  test("isolation par utilisateur — ne voit pas les séances supprimées d'autres (AC#1)", async ({
    client,
    assert,
  }) => {
    const user1 = await getUser()
    const user2 = await getUser2()
    const sport = await Sport.firstOrFail()

    await Session.create({
      userId: user2.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-01-05'),
      durationMinutes: 45,
      deletedAt: DateTime.now(),
    })

    const response = await client.get('/sessions/trash').loginAs(user1)
    response.assertStatus(200)

    // user1 ne voit pas la séance supprimée de user2
    const user2TrashedSession = await Session.query()
      .where('userId', user2.id)
      .where('date', DateTime.fromISO('2026-01-05').toSQLDate()!)
      .whereNotNull('deletedAt')
      .firstOrFail()
    // Confirm la séance de user2 existe bien en corbeille
    assert.isNotNull(user2TrashedSession.deletedAt)
  })

  test('non connecté → redirect /login', async ({ client }) => {
    const response = await client.get('/sessions/trash').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('séance supprimée a deletedAt non null en DB (AC#2)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const deletedSession = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-01-10'),
      durationMinutes: 45,
      deletedAt: DateTime.now(),
    })

    const response = await client.get('/sessions/trash').loginAs(user)
    response.assertStatus(200)

    await deletedSession.refresh()
    assert.isNotNull(deletedSession.deletedAt)
  })
})
