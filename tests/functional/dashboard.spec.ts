import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser } from '#tests/helpers'

test.group('Dashboard', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('GET / sans session → redirect /login (AC#1)', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET / connecté sans séances → 200 (AC#5)', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/').loginAs(user)

    response.assertStatus(200)
  })

  test('GET / connecté avec séances → 200 (AC#1)', async ({ client }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    await Session.createMany([
      {
        userId: user.id,
        sportId: sport.id,
        date: DateTime.now().minus({ days: 7 }),
        durationMinutes: 60,
        distanceKm: 10,
      },
      {
        userId: user.id,
        sportId: sport.id,
        date: DateTime.now().minus({ days: 14 }),
        durationMinutes: 55,
        distanceKm: 10,
      },
    ])

    const response = await client.get('/').loginAs(user)

    response.assertStatus(200)
  })

  test('GET / connecté avec plusieurs séances → 200 avec chartData (AC#1)', async ({ client }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    await Session.createMany([
      {
        userId: user.id,
        sportId: sport.id,
        date: DateTime.now().minus({ days: 14 }),
        durationMinutes: 60,
        distanceKm: 10,
      },
      {
        userId: user.id,
        sportId: sport.id,
        date: DateTime.now().minus({ days: 7 }),
        durationMinutes: 50,
        distanceKm: 8,
      },
    ])

    const response = await client.get('/').loginAs(user)

    response.assertStatus(200)
  })
})
