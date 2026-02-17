import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Auth / Login', (group) => {
  group.each.setup(async () => testUtils.db().withGlobalTransaction())

  test('GET /login — affiche la page connexion', async ({ client }) => {
    const response = await client.get('/login')
    response.assertStatus(200)
  })

  test('POST /login — credentials valides → 302 redirect vers /', async ({ client }) => {
    const { default: User } = await import('#models/user')
    await User.create({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'admin',
    })

    const response = await client
      .post('/login')
      .form({ email: 'user@example.com', password: 'password123' })
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
    const { default: User } = await import('#models/user')
    await User.create({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'admin',
    })

    const responseBadEmail = await client
      .post('/login')
      .form({ email: 'wrong@example.com', password: 'password123' })
      .redirects(0)

    const responseBadPassword = await client
      .post('/login')
      .form({ email: 'user@example.com', password: 'wrongpassword' })
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
