import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import UserProfile from '#models/user_profile'
import Sport from '#models/sport'
import db from '@adonisjs/lucid/services/db'
import { getAdmin, SEEDED_ADMIN_EMAIL } from '#tests/helpers'
import { UserLevel } from '#domain/entities/user_profile'

async function createUserWithProfile() {
  const user = await User.create({
    fullName: 'Profile User',
    email: `profile-${Date.now()}@example.com`,
    password: 'password123',
    role: 'user',
    onboardingCompleted: true,
  })

  const sport = await Sport.firstOrFail()

  const profile = await UserProfile.create({
    userId: user.id,
    level: UserLevel.Intermediate,
    objective: 'run_faster',
    preferences: {
      speedUnit: 'min_km',
      distanceUnit: 'km',
      weightUnit: 'kg',
      weekStartsOn: 'monday',
      dateFormat: 'DD/MM/YYYY',
      locale: 'fr',
    },
  })

  await db
    .table('user_profile_sports')
    .insert({ user_profile_id: profile.id, sport_id: sport.id, created_at: new Date() })

  return { user, profile, sport }
}

test.group('Profile / Consultation & Modification', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('GET /profile non connecté → redirect /login', async ({ client }) => {
    const response = await client.get('/profile').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /profile → 200 avec les données user + profil', async ({ client }) => {
    const { user } = await createUserWithProfile()

    const response = await client.get('/profile').loginAs(user)

    response.assertStatus(200)
  })

  test('PUT /profile non connecté → redirect /login', async ({ client }) => {
    const response = await client.put('/profile').form({ full_name: 'Test' }).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('PUT /profile valide → fullName mis à jour en DB', async ({ client, assert }) => {
    const { user } = await createUserWithProfile()

    const response = await client
      .put('/profile')
      .form({ full_name: 'Nouveau Nom' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const updated = await User.findOrFail(user.id)
    assert.equal(updated.fullName, 'Nouveau Nom')
  })

  test('PUT /profile valide → profil sportif mis à jour en DB', async ({ client, assert }) => {
    const { user, profile } = await createUserWithProfile()

    const response = await client
      .put('/profile')
      .form({ level: 'advanced', objective: 'prepare_competition' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const updated = await UserProfile.findOrFail(profile.id)
    assert.equal(updated.level, 'advanced')
    assert.equal(updated.objective, 'prepare_competition')
  })

  test('PUT /profile valide → flash success', async ({ client }) => {
    const { user } = await createUserWithProfile()

    const response = await client
      .put('/profile')
      .form({ full_name: 'Nouveau Nom' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Profil mis à jour')
  })

  test('PUT /profile email dupliqué → erreur validation', async ({ client }) => {
    const { user } = await createUserWithProfile()

    const response = await client
      .put('/profile')
      .form({ email: SEEDED_ADMIN_EMAIL })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorsBag', {
      E_VALIDATION_ERROR: 'The form could not be saved. Please check the errors below.',
    })
  })

  test('PUT /profile email valide → email mis à jour en DB', async ({ client, assert }) => {
    const { user } = await createUserWithProfile()
    const newEmail = `updated-${Date.now()}@example.com`

    await client.put('/profile').form({ email: newEmail }).loginAs(user).redirects(0)

    const updated = await User.findOrFail(user.id)
    assert.equal(updated.email, newEmail)
  })

  test('PUT /profile email soi-même → pas dupliqué', async ({ client, assert }) => {
    const admin = await getAdmin()

    const response = await client
      .put('/profile')
      .form({ email: SEEDED_ADMIN_EMAIL })
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    const updated = await User.findOrFail(admin.id)
    assert.equal(updated.email, SEEDED_ADMIN_EMAIL)
  })
})
