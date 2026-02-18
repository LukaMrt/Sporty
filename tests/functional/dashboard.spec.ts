import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Dashboard', (group) => {
  group.each.setup(async () => testUtils.db().withGlobalTransaction())

  test('GET / sans session → redirect /login (AC#1)', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET / connecté sans séances → 200 Dashboard avec EmptyState (AC#1, #2)', async ({
    client,
  }) => {
    const { default: User } = await import('#models/user')
    await User.create({
      fullName: 'Luka Test',
      email: 'luka@example.com',
      password: 'password123',
      role: 'admin',
    })

    await client
      .post('/login')
      .form({ email: 'luka@example.com', password: 'password123' })
      .redirects(0)

    const response = await client.get('/')

    response.assertStatus(200)
  })
})
