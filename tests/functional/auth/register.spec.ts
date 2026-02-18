import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Auth / Register', (group) => {
  group.each.setup(async () => testUtils.db().withGlobalTransaction())
  test('GET /register — aucun user → affiche la page inscription', async ({ client }) => {
    const response = await client.get('/register')
    response.assertStatus(200)
  })

  test('GET /register — user existant → redirect /login', async ({ client }) => {
    const { default: User } = await import('#models/user')
    await User.create({
      fullName: 'Existing Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    })

    const response = await client.get('/register').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /register — données valides → 302 redirect vers /', async ({ client }) => {
    const response = await client
      .post('/register')
      .form({
        full_name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('POST /register — email invalide → redirect back avec erreurs', async ({ client }) => {
    const response = await client
      .post('/register')
      .form({
        full_name: 'Admin',
        email: 'not-an-email',
        password: 'password123',
      })
      .redirects(0)

    response.assertStatus(302)
  })

  test('POST /register — mot de passe trop court → redirect back avec erreurs', async ({
    client,
  }) => {
    const response = await client
      .post('/register')
      .form({
        full_name: 'Admin',
        email: 'admin@example.com',
        password: 'short',
      })
      .redirects(0)

    response.assertStatus(302)
  })

  test('POST /register — user existant → 403', async ({ client }) => {
    const { default: User } = await import('#models/user')
    await User.create({
      fullName: 'Existing Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    })

    const response = await client
      .post('/register')
      .form({
        full_name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      })
      .redirects(0)

    response.assertStatus(403)
  })
})
