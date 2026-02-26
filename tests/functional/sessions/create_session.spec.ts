import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser } from '#tests/helpers'

test.group('Sessions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // --- GET /sessions ---

  test('GET /sessions non connecté → redirect /login (AC#1)', async ({ client }) => {
    const response = await client.get('/sessions').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /sessions connecté → 200 (AC#1)', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/sessions').loginAs(user)

    response.assertStatus(200)
  })

  // --- POST /sessions ---

  test('POST /sessions non connecté → redirect /login (AC#5)', async ({ client }) => {
    const sport = await Sport.firstOrFail()

    const response = await client
      .post('/sessions')
      .form({ sport_id: sport.id, date: '2026-02-25', duration_minutes: 45 })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /sessions valide → 302 redirect + séance en DB + flash success (AC#4)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    const response = await client
      .post('/sessions')
      .form({ sport_id: sport.id, date: '2026-02-25', duration_minutes: 45 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/sessions')
    response.assertFlashMessage('success', 'Séance ajoutée')

    const session = await Session.query()
      .where('userId', user.id)
      .where('sportId', sport.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(session.durationMinutes, 45)
  })

  test('POST /sessions avec champs optionnels → séance enregistrée complète', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    await client
      .post('/sessions')
      .form({
        sport_id: sport.id,
        date: '2026-02-25',
        duration_minutes: 60,
        distance_km: 10.5,
        avg_heart_rate: 145,
        perceived_effort: 4,
        notes: 'Belle sortie',
      })
      .loginAs(user)
      .redirects(0)

    const session = await Session.query()
      .where('userId', user.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(Number(session.distanceKm), 10.5)
    assert.equal(session.avgHeartRate, 145)
    assert.equal(session.perceivedEffort, 4)
    assert.equal(session.notes, 'Belle sortie')
  })

  test('POST /sessions données invalides → redirect back + errors (AC#4)', async ({ client }) => {
    const user = await getUser()

    const response = await client
      .post('/sessions')
      .form({ sport_id: 'abc', date: '', duration_minutes: 0 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorsBag', {
      E_VALIDATION_ERROR: 'The form could not be saved. Please check the errors below.',
    })
  })

  test('POST /sessions sport_id inexistant → redirect back + errors', async ({ client }) => {
    const user = await getUser()

    const response = await client
      .post('/sessions')
      .form({ sport_id: 99999, date: '2026-02-25', duration_minutes: 45 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorsBag', {
      E_VALIDATION_ERROR: 'The form could not be saved. Please check the errors below.',
    })
  })
})
