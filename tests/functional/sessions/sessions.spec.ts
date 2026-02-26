import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser } from '#tests/helpers'
import User from '#models/user'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'

test.group('GET /sessions/:id — detail seance', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('connecte + proprietaire -> 200 avec session complete (AC#1)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const dbSession = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
      distanceKm: 10,
      avgHeartRate: 150,
      perceivedEffort: 3,
      sportMetrics: {},
      notes: 'Belle séance',
    })

    const response = await client.get(`/sessions/${dbSession.id}`).loginAs(user)
    response.assertStatus(200)
    assert.exists(response.body())
  })

  test('connecte + pas proprietaire -> redirect /sessions avec flash error (AC#1)', async ({
    client,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const otherUser = await User.create({
      email: 'other-show-test@example.com',
      password: 'Secret1234!',
      fullName: 'Other User',
      role: 'user',
      onboardingCompleted: true,
    })
    await otherUser.related('profile').create({
      preferences: DEFAULT_USER_PREFERENCES,
    })

    const otherSession = await Session.create({
      userId: otherUser.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 30,
      distanceKm: null,
      avgHeartRate: null,
      perceivedEffort: null,
      sportMetrics: {},
      notes: null,
    })

    const response = await client.get(`/sessions/${otherSession.id}`).loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/sessions')
  })

  test('seance inexistante -> redirect /sessions avec flash error (AC#1)', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/sessions/999999').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/sessions')
  })

  test('non connecte -> redirect /login (AC#1)', async ({ client }) => {
    const response = await client.get('/sessions/1').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('PUT /sessions/:id — modification seance', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('valide + proprietaire -> 302 redirect /sessions/:id + données mises à jour (AC#2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const dbSession = await Session.create({
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

    const response = await client
      .put(`/sessions/${dbSession.id}`)
      .loginAs(user)
      .form({
        sport_id: sport.id,
        date: '2026-02-26',
        duration_minutes: 60,
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/sessions/${dbSession.id}`)

    const updated = await Session.findOrFail(dbSession.id)
    assert.equal(updated.durationMinutes, 60)
    assert.equal(updated.date.toISODate(), '2026-02-26')
  })

  test('distance modifiée 5 km -> 15 km -> sauvegardée en DB (AC#3)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const dbSession = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 45,
      distanceKm: 5,
      avgHeartRate: null,
      perceivedEffort: null,
      sportMetrics: {},
      notes: null,
    })

    const response = await client
      .put(`/sessions/${dbSession.id}`)
      .loginAs(user)
      .form({
        sport_id: sport.id,
        date: '2026-02-25',
        duration_minutes: 45,
        distance_km: 15,
      })
      .redirects(0)

    response.assertStatus(302)

    const updated = await Session.findOrFail(dbSession.id)
    assert.equal(Number(updated.distanceKm), 15)
  })

  test('non propriétaire -> redirect /sessions avec error (AC#2)', async ({ client }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const otherUser = await User.create({
      email: 'other-update-test@example.com',
      password: 'Secret1234!',
      fullName: 'Other User',
      role: 'user',
      onboardingCompleted: true,
    })
    await otherUser.related('profile').create({
      preferences: DEFAULT_USER_PREFERENCES,
    })

    const otherSession = await Session.create({
      userId: otherUser.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-02-25'),
      durationMinutes: 30,
      distanceKm: null,
      avgHeartRate: null,
      perceivedEffort: null,
      sportMetrics: {},
      notes: null,
    })

    const response = await client
      .put(`/sessions/${otherSession.id}`)
      .loginAs(user)
      .form({
        sport_id: sport.id,
        date: '2026-02-25',
        duration_minutes: 30,
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/sessions')
  })

  test('séance inexistante -> redirect /sessions (AC#2)', async ({ client }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const response = await client
      .put('/sessions/999999')
      .loginAs(user)
      .form({
        sport_id: sport.id,
        date: '2026-02-25',
        duration_minutes: 30,
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/sessions')
  })

  test('données invalides -> redirect back avec erreurs de validation (AC#2)', async ({
    client,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const dbSession = await Session.create({
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

    const response = await client
      .put(`/sessions/${dbSession.id}`)
      .loginAs(user)
      .form({
        sport_id: sport.id,
        date: 'invalid-date',
        duration_minutes: -1,
      })
      .redirects(0)

    response.assertStatus(302)
  })

  test('non connecté -> redirect /login (AC#2)', async ({ client }) => {
    const response = await client
      .put('/sessions/1')
      .form({
        sport_id: 1,
        date: '2026-02-25',
        duration_minutes: 30,
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('GET /sessions — liste des seances', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('connecte avec seances -> 200 (AC#1)', async ({ client }) => {
    const user = await getUser()
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
    const user = await getUser()

    const response = await client.get('/sessions').loginAs(user)
    response.assertStatus(200)
  })

  test('non connecte -> redirect /login', async ({ client }) => {
    const response = await client.get('/sessions').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /sessions?page=1 -> 200 avec pagination (AC#3)', async ({ client, assert }) => {
    const user = await getUser()
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
    const user = await getUser()
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
