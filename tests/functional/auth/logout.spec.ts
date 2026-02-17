import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Auth / Logout', (group) => {
  group.each.setup(async () => testUtils.db().withGlobalTransaction())

  test('POST /logout — utilisateur connecté → session invalidée → redirect /login (AC#1)', async ({
    client,
  }) => {
    const { default: User } = await import('#models/user')
    await User.create({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'admin',
    })

    const loginResponse = await client
      .post('/login')
      .form({ email: 'user@example.com', password: 'password123' })
      .redirects(0)

    const cookies = loginResponse.cookies()

    const response = await client.post('/logout').cookies(cookies).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('accès route protégée après logout → redirect /login (AC#2)', async ({ client }) => {
    const { default: User } = await import('#models/user')
    await User.create({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'admin',
    })

    // Login
    const loginResponse = await client
      .post('/login')
      .form({ email: 'user@example.com', password: 'password123' })
      .redirects(0)

    const cookies = loginResponse.cookies()

    // Logout with session cookies
    const logoutResponse = await client.post('/logout').cookies(cookies).redirects(0)
    logoutResponse.assertStatus(302)
    logoutResponse.assertHeader('location', '/login')

    // Try to access protected route with same (now-invalidated) cookies → should redirect
    const afterLogoutResponse = await client.get('/').cookies(cookies).redirects(0)
    afterLogoutResponse.assertStatus(302)
    afterLogoutResponse.assertHeader('location', '/login')
  })

  test('POST /logout — non connecté → redirect /login (auth middleware)', async ({ client }) => {
    const response = await client.post('/logout').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
