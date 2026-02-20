import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getUser } from '#tests/helpers'

test.group('Dashboard', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET / sans session → redirect /login (AC#1)', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET / connecté sans séances → 200 Dashboard avec EmptyState (AC#1, #2)', async ({
    client,
  }) => {
    const user = await getUser()

    const response = await client.get('/').loginAs(user)

    response.assertStatus(200)
  })
})
