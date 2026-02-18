import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'

async function createAndLoginUser(client: ApiClient) {
  const { default: User } = await import('#models/user')
  await User.create({
    fullName: 'Luka Test',
    email: 'nav@example.com',
    password: 'password123',
    role: 'admin',
  })
  await client
    .post('/login')
    .form({ email: 'nav@example.com', password: 'password123' })
    .redirects(0)
}

test.group('Navigation', (group) => {
  group.each.setup(async () => testUtils.db().withGlobalTransaction())

  test('GET / — authentifié → 200', async ({ client }) => {
    await createAndLoginUser(client)
    const response = await client.get('/')
    response.assertStatus(200)
  })

  test('GET /sessions — authentifié → 200', async ({ client }) => {
    await createAndLoginUser(client)
    const response = await client.get('/sessions')
    response.assertStatus(200)
  })

  test('GET /planning — authentifié → 200', async ({ client }) => {
    await createAndLoginUser(client)
    const response = await client.get('/planning')
    response.assertStatus(200)
  })

  test('GET /profile — authentifié → 200', async ({ client }) => {
    await createAndLoginUser(client)
    const response = await client.get('/profile')
    response.assertStatus(200)
  })

  test('GET /sessions — non authentifié → redirect /login', async ({ client }) => {
    const response = await client.get('/sessions').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('navigation Inertia — requête X-Inertia sans version → 409 (protocole SPA actif)', async ({
    client,
  }) => {
    await createAndLoginUser(client)
    const response = await client.get('/sessions').header('X-Inertia', 'true')
    response.assertStatus(409)
  })
})
