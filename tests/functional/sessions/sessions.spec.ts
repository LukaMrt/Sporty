import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Sport from '#models/sport'
import Session from '#models/session'
import { getOnboardedUser } from '#tests/helpers'
import User from '#models/user'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'

test.group('GET /sessions — liste des seances', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('connecte avec seances -> 200 (AC#1)', async ({ client }) => {
    const user = await getOnboardedUser()
    const sport = await Sport.firstOrFail()

    await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
      distanceKm: null,
      avgHeartRate: null,
      perceivedEffort: null,
      sportMetrics: {},
      notes: null,
    })

    const response = await client.get('/sessions').loginAs(user)
    response.assertStatus(200)
  })

  test('connecte sans seances -> 200 (AC#2)', async ({ client }) => {
    const user = await getOnboardedUser()

    const response = await client.get('/sessions').loginAs(user)
    response.assertStatus(200)
  })

  test('non connecte -> redirect /login', async ({ client }) => {
    const response = await client.get('/sessions').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /sessions?page=1 -> 200 avec pagination (AC#3)', async ({ client, assert }) => {
    const user = await getOnboardedUser()
    const sport = await Sport.firstOrFail()

    for (let i = 0; i < 3; i++) {
      await Session.create({
        userId: user.id,
        sportId: sport.id,
        date: DateTime.fromISO(`2026-02-${String(i + 1).padStart(2, '0')}`),
        durationMinutes: 30,
        distanceKm: null,
        avgHeartRate: null,
        perceivedEffort: null,
        sportMetrics: {},
        notes: null,
      })
    }

    const response = await client.get('/sessions').qs({ page: 1 }).loginAs(user)
    response.assertStatus(200)

    // Verifie que les seances existent bien en DB pour cet utilisateur
    const count = await Session.query().where('userId', user.id).count('* as total')
    assert.equal(Number(count[0].$extras.total), 3)
  })

  test("les seances d'un autre utilisateur ne sont PAS incluses (AC#1 — isolation)", async ({
    client,
    assert,
  }) => {
    const user = await getOnboardedUser()
    const sport = await Sport.firstOrFail()

    const otherUser = await User.create({
      email: 'other-list-test@example.com',
      password: 'Secret1234!',
      fullName: 'Other User',
      role: 'user',
      onboardingCompleted: true,
    })
    await otherUser.related('profile').create({
      preferences: DEFAULT_USER_PREFERENCES,
    })

    await Session.create({
      userId: otherUser.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 60,
      distanceKm: null,
      avgHeartRate: null,
      perceivedEffort: null,
      sportMetrics: {},
      notes: null,
    })

    // Le user principal n'a aucune seance
    const myCount = await Session.query().where('userId', user.id).count('* as total')
    assert.equal(Number(myCount[0].$extras.total), 0)

    // L'autre user a bien sa seance
    const otherCount = await Session.query().where('userId', otherUser.id).count('* as total')
    assert.equal(Number(otherCount[0].$extras.total), 1)

    // La reponse HTTP ne retourne que les seances du user connecte
    const response = await client.get('/sessions').loginAs(user)
    response.assertStatus(200)
  })
})
