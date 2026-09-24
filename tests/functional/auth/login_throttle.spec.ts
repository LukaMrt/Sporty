import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { SEEDED_ADMIN_EMAIL } from '#tests/helpers'

test.group('Auth / Limitation des tentatives de connexion', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('bloque après 5 échecs pour le même email', async ({ client, assert }) => {
    for (let i = 0; i < 5; i++) {
      await client
        .post('/login')
        .form({ email: SEEDED_ADMIN_EMAIL, password: 'wrong-password' })
        .redirects(0)
    }

    const response = await client
      .post('/login')
      .form({ email: SEEDED_ADMIN_EMAIL, password: 'wrong-password' })
      .redirects(0)

    response.assertStatus(302)
    const errors = response.flashMessage('inputErrorsBag') as { form: string[] }
    assert.match(errors.form[0], /(tentatives|attempts)/i)
  })
})

test.group('Auth / Invalidation des sessions après reset du mot de passe', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('une session ouverte avant un reset admin est refusée', async ({ client }) => {
    const { getUser } = await import('#tests/helpers')
    const user = await getUser()
    // Simule une session ouverte avant le changement : version stockée = 0
    user.sessionVersion = 1
    await user.save()

    const response = await client
      .get('/sessions')
      .loginAs(user)
      .withSession({ session_version: 0 })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
