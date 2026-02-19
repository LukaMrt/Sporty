import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createUser } from '#tests/helpers'

test.group('Navigation', (group) => {
  group.each.setup(async () => testUtils.db().withGlobalTransaction())

  test('GET / — authentifié → 200', async ({ client }) => {
    const user = await createUser()
    const response = await client.get('/').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /sessions — authentifié → 200', async ({ client }) => {
    const user = await createUser()
    const response = await client.get('/sessions').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /planning — authentifié → 200', async ({ client }) => {
    const user = await createUser()
    const response = await client.get('/planning').loginAs(user)
    response.assertStatus(200)
  })

  test('GET /profile — authentifié → 200', async ({ client }) => {
    const user = await createUser()
    const response = await client.get('/profile').loginAs(user)
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
    const user = await createUser()
    const response = await client.get('/sessions').loginAs(user).header('X-Inertia', 'true')
    response.assertStatus(409)
  })
})
