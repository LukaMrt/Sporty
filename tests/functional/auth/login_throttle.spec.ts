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
