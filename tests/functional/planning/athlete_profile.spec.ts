import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import UserProfile from '#models/user_profile'
import { getUser, getAdmin } from '#tests/helpers'
import { TrainingState } from '#domain/value_objects/planning_types'

test.group('AthleteProfile / Page profil athlète', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('GET /profile/athlete non connecté → redirect /login', async ({ client }) => {
    const response = await client.get('/profile/athlete').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /profile/athlete connecté → 200', async ({ client }) => {
    const user = await getUser()
    const response = await client.get('/profile/athlete').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /profile/athlete → expose les props Inertia', async ({ client, assert }) => {
    const user = await getUser()
    const response = await client
      .get('/profile/athlete')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')
    response.assertStatus(200)
    const body = response.body() as { props: Record<string, unknown> }
    assert.property(body.props, 'profile')
    assert.property(body.props, 'vdot')
    assert.property(body.props, 'paceZones')
    assert.property(body.props, 'fitnessProfile')
  })

  test('GET /profile/athlete/estimate-vdot → retourne vdot, method, paceZones', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const response = await client
      .get('/profile/athlete/estimate-vdot')
      .loginAs(user)
      .header('Accept', 'application/json')
    response.assertStatus(200)
    const body = response.body() as { vdot: number; method: string; paceZones: unknown }
    assert.property(body, 'vdot')
    assert.property(body, 'method')
    assert.property(body, 'paceZones')
    assert.isNumber(body.vdot)
    assert.include(['history', 'vma', 'questionnaire'], body.method)
  })

  test('GET /profile/athlete/estimate-vdot avec questionnaire → method=questionnaire', async ({
    client,
    assert,
  }) => {
    // Créer un user sans séances ni VMA
    const user = await User.create({
      fullName: 'New Athlete',
      email: `athlete-${Date.now()}@example.com`,
      password: 'password123',
      role: 'user',
      onboardingCompleted: true,
    })
    await UserProfile.create({
      userId: user.id,
      trainingState: TrainingState.Idle,
      preferences: {
        speedUnit: 'min_km',
        distanceUnit: 'km',
        weightUnit: 'kg',
        weekStartsOn: 'monday',
        dateFormat: 'DD/MM/YYYY',
        locale: 'fr',
      },
    })

    const response = await client
      .get(
        '/profile/athlete/estimate-vdot?frequency=occasional&experience=beginner&typical_distance=less_5k'
      )
      .loginAs(user)
      .header('Accept', 'application/json')
    response.assertStatus(200)
    const body = response.body() as { vdot: number; method: string }
    assert.equal(body.method, 'questionnaire')
    assert.equal(body.vdot, 25)
  })

  test('POST /profile/athlete/confirm-vdot → stocke VDOT et retourne zones', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const response = await client
      .post('/profile/athlete/confirm-vdot')
      .loginAs(user)
      .json({ vdot: 42 })
    response.assertStatus(200)
    const body = response.body() as { vdot: number; paceZones: Record<string, unknown> }
    assert.equal(body.vdot, 42)
    assert.property(body, 'paceZones')
    assert.property(body.paceZones, 'easy')
    assert.property(body.paceZones, 'threshold')
  })

  test('PUT /profile/athlete → persiste le sexe (admin avec profil)', async ({
    client,
    assert,
  }) => {
    const admin = await getAdmin()
    const response = await client
      .put('/profile/athlete')
      .loginAs(admin)
      .form({ sex: 'female' })
      .redirects(0)
    response.assertStatus(302)

    const profile = await UserProfile.findByOrFail('userId', admin.id)
    assert.equal(profile.sex, 'female')
  })

  test('PUT /profile/athlete sexe non renseigné accepté', async ({ client }) => {
    const admin = await getAdmin()
    const response = await client
      .put('/profile/athlete')
      .loginAs(admin)
      .form({ sex: '' })
      .redirects(0)
    response.assertStatus(302)
  })
})
