import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { SEEDED_USER_EMAIL, SEEDED_PASSWORD } from '#tests/helpers'

test.group('Auth / Login', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /login — affiche la page connexion', async ({ client }) => {
    const response = await client.get('/login')
    response.assertStatus(200)
  })

  test('POST /login — credentials valides → 302 redirect vers /', async ({ client }) => {
    const response = await client
      .post('/login')
      .form({ email: SEEDED_USER_EMAIL, password: SEEDED_PASSWORD })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('POST /login — credentials invalides → redirect back avec erreur générique', async ({
    client,
  }) => {
    const response = await client
      .post('/login')
      .form({ email: 'nonexistent@example.com', password: 'wrongpassword' })
      .redirects(0)

    response.assertStatus(302)
  })

  test('POST /login — email inexistant → même erreur que mauvais mot de passe', async ({
    client,
  }) => {
    const responseBadEmail = await client
      .post('/login')
      .form({ email: 'wrong@example.com', password: SEEDED_PASSWORD })
      .redirects(0)

    const responseBadPassword = await client
      .post('/login')
      .form({ email: SEEDED_USER_EMAIL, password: 'wrongpassword' })
      .redirects(0)

    responseBadEmail.assertStatus(302)
    responseBadPassword.assertStatus(302)
  })

  test('route protégée sans session → redirect /login', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
