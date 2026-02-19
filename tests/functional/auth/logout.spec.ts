import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createUser } from '#tests/helpers'

test.group('Auth / Logout', (group) => {
  group.each.setup(async () => testUtils.db().withGlobalTransaction())

  test('POST /logout — utilisateur connecté → session invalidée → redirect /login (AC#1)', async ({
    client,
  }) => {
    const user = await createUser()

    const response = await client.post('/logout').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /logout — non connecté → redirect /login (auth middleware)', async ({ client }) => {
    const response = await client.post('/logout').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
