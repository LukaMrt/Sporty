import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import UserProfile from '#models/user_profile'
import Sport from '#models/sport'
import db from '@adonisjs/lucid/services/db'
import { getUser } from '#tests/helpers'
import { UserLevel } from '#domain/entities/user_profile'

async function createUserWithProfile(locale: 'fr' | 'en' = 'fr') {
  const user = await User.create({
    fullName: 'Locale User',
    email: `locale-${Date.now()}@example.com`,
    password: 'password123',
    role: 'user',
    onboardingCompleted: true,
  })

  const sport = await Sport.firstOrFail()

  const profile = await UserProfile.create({
    userId: user.id,
    level: UserLevel.Intermediate,
    objective: null,
    preferences: {
      speedUnit: 'min_km',
      distanceUnit: 'km',
      weightUnit: 'kg',
      weekStartsOn: 'monday',
      dateFormat: 'DD/MM/YYYY',
      locale,
    },
  })

  await db
    .table('user_profile_sports')
    .insert({ user_profile_id: profile.id, sport_id: sport.id, created_at: new Date() })

  return { user, profile }
}

test.group('Locale / Switch', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('POST /locale non authentifié → locale stockée en session (302)', async ({ client }) => {
    const response = await client.post('/locale').form({ locale: 'en' }).redirects(0)

    response.assertStatus(302)
  })

  test('POST /locale locale invalide → redirect back sans planter', async ({ client }) => {
    const response = await client.post('/locale').form({ locale: 'es' }).redirects(0)

    response.assertStatus(302)
  })

  test('POST /locale authentifié → locale persistée dans le profil', async ({ client, assert }) => {
    const { user, profile } = await createUserWithProfile('fr')

    const response = await client.post('/locale').form({ locale: 'en' }).loginAs(user).redirects(0)

    response.assertStatus(302)

    const updated = await UserProfile.findOrFail(profile.id)
    assert.equal(updated.preferences.locale, 'en')
  })

  test('POST /locale authentifié → locale fr persistée dans le profil', async ({
    client,
    assert,
  }) => {
    const { user, profile } = await createUserWithProfile('en')

    await client.post('/locale').form({ locale: 'fr' }).loginAs(user).redirects(0)

    const updated = await UserProfile.findOrFail(profile.id)
    assert.equal(updated.preferences.locale, 'fr')
  })

  test('POST /locale authentifié sans profil → pas de crash', async ({ client }) => {
    const user = await getUser()

    const response = await client.post('/locale').form({ locale: 'en' }).loginAs(user).redirects(0)

    response.assertStatus(302)
  })
})
