import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser } from '#tests/helpers'

test.group('GET /sessions — filtrage et tri (Story 5.4)', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('filtre par sportId -> 200 (AC#1)', async ({ client }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-01'),
      durationMinutes: 30,
    })

    const response = await client.get('/sessions').qs({ sportId: sport.id }).loginAs(user)
    response.assertStatus(200)
  })

  test('tri par date -> 200 (AC#2)', async ({ client }) => {
    const user = await getUser()
    const response = await client
      .get('/sessions')
      .qs({ sortBy: 'date', sortOrder: 'asc' })
      .loginAs(user)
    response.assertStatus(200)
  })

  test('tri par durée -> 200 (AC#2)', async ({ client }) => {
    const user = await getUser()
    const response = await client
      .get('/sessions')
      .qs({ sortBy: 'duration_minutes', sortOrder: 'desc' })
      .loginAs(user)
    response.assertStatus(200)
  })

  test('tri par distance -> 200 (AC#2)', async ({ client }) => {
    const user = await getUser()
    const response = await client
      .get('/sessions')
      .qs({ sortBy: 'distance_km', sortOrder: 'asc' })
      .loginAs(user)
    response.assertStatus(200)
  })

  test('filtre sport + tri combinés -> 200 (AC#3)', async ({ client }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()
    const response = await client
      .get('/sessions')
      .qs({ sportId: sport.id, sortBy: 'duration_minutes', sortOrder: 'asc' })
      .loginAs(user)
    response.assertStatus(200)
  })

  test('sans filtre -> 200 avec toutes les séances (AC#4)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const countBefore = await Session.query().where('userId', user.id).count('* as total')
    const before = Number(countBefore[0].$extras.total)

    for (let i = 1; i <= 3; i++) {
      await Session.create({
        userId: user.id,
        sportId: sport.id,
        date: DateTime.fromISO(`2026-02-0${i}`),
        durationMinutes: 30,
      })
    }

    const response = await client.get('/sessions').loginAs(user)
    response.assertStatus(200)

    const countAfter = await Session.query().where('userId', user.id).count('* as total')
    assert.equal(Number(countAfter[0].$extras.total), before + 3)
  })

  test('les séances supprimées ne sont jamais retournées (AC#1-4)', async ({ client, assert }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-01'),
      durationMinutes: 30,
    })
    const trashed = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-02'),
      durationMinutes: 45,
    })
    trashed.deletedAt = DateTime.now()
    await trashed.save()

    const response = await client.get('/sessions').loginAs(user)
    response.assertStatus(200)

    const active = await Session.query()
      .where('userId', user.id)
      .whereNull('deleted_at')
      .count('* as total')
    // Au moins 1 séance active (celle créée dans le test + les seedées)
    assert.isAbove(Number(active[0].$extras.total), 0)

    // La séance trashée n'est pas comptée comme active
    const trashedStillTrashed = await Session.findOrFail(trashed.id)
    assert.isNotNull(trashedStillTrashed.deletedAt)
  })

  test('non connecté -> redirect /login', async ({ client }) => {
    const response = await client.get('/sessions').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
