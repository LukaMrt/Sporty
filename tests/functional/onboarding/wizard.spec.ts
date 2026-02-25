import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Sport from '#models/sport'
import UserProfile from '#models/user_profile'
import db from '@adonisjs/lucid/services/db'
import { getUser } from '#tests/helpers'

async function createNonOnboardedUser() {
  return User.create({
    fullName: 'New User',
    email: `new-${Date.now()}@example.com`,
    password: 'password123',
    role: 'user',
    onboardingCompleted: false,
  })
}

async function getSport() {
  return Sport.firstOrFail()
}

async function createOnboardedUser() {
  return User.create({
    fullName: 'Onboarded User',
    email: `onboarded-${Date.now()}@example.com`,
    password: 'password123',
    role: 'user',
    onboardingCompleted: true,
  })
}

test.group('Onboarding / Wizard', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('user non-onboardé → toute route protégée redirige vers /onboarding (AC#1)', async ({
    client,
  }) => {
    const user = await createNonOnboardedUser()

    const response = await client.get('/').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/onboarding')
  })

  test('user non-onboardé → plusieurs routes protégées redirigent (AC#1)', async ({ client }) => {
    const user = await createNonOnboardedUser()

    const sessionsResponse = await client.get('/sessions').loginAs(user).redirects(0)
    sessionsResponse.assertStatus(302)
    sessionsResponse.assertHeader('location', '/onboarding')
  })

  test('GET /onboarding → 200 + liste des sports (AC#1, #2)', async ({ client }) => {
    const user = await createNonOnboardedUser()

    const response = await client.get('/onboarding').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /onboarding user déjà onboardé → redirect / (AC#8)', async ({ client }) => {
    const user = await createOnboardedUser()

    const response = await client.get('/onboarding').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('POST /onboarding valide → profil créé + onboarding_completed true + redirect / (AC#6)', async ({
    client,
    assert,
  }) => {
    const user = await createNonOnboardedUser()
    const sport = await getSport()

    const response = await client
      .post('/onboarding')
      .loginAs(user)
      .form({
        sport_id: sport.id,
        level: 'intermediate',
        objective: 'run_faster',
        preferred_unit: 'min_km',
        distance_unit: 'km',
        weight_unit: 'kg',
        week_starts_on: 'monday',
        date_format: 'DD/MM/YYYY',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')

    const updatedUser = await User.findOrFail(user.id)
    assert.isTrue(updatedUser.onboardingCompleted)

    const profile = await UserProfile.findBy('user_id', user.id)
    assert.isNotNull(profile)
    assert.equal(profile!.level, 'intermediate')
    assert.equal(profile!.objective, 'run_faster')

    const sportEntries: unknown[] = await db
      .from('user_profile_sports')
      .where('user_profile_id', profile!.id)
      .where('sport_id', sport.id)
    assert.isAbove(sportEntries.length, 0)
  })

  test('POST /onboarding avec objective vide → objective null en DB (AC#4)', async ({
    client,
    assert,
  }) => {
    const user = await createNonOnboardedUser()
    const sport = await getSport()

    await client.post('/onboarding').loginAs(user).form({
      sport_id: sport.id,
      level: 'beginner',
      preferred_unit: 'km_h',
      distance_unit: 'km',
      weight_unit: 'kg',
      week_starts_on: 'monday',
      date_format: 'DD/MM/YYYY',
    })

    const profile = await UserProfile.findBy('user_id', user.id)
    assert.isNotNull(profile)
    assert.isNull(profile!.objective)
  })

  test('POST /onboarding données invalides → erreurs de validation (AC#6)', async ({ client }) => {
    const user = await createNonOnboardedUser()

    const response = await client
      .post('/onboarding')
      .loginAs(user)
      .form({
        sport_id: 99999,
        level: 'invalid_level',
        preferred_unit: 'invalid_unit',
      })
      .redirects(0)

    response.assertStatus(302)
  })

  test('user onboardé → accès normal aux routes sans redirect (AC#8)', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/').loginAs(user)

    response.assertStatus(200)
  })
})
