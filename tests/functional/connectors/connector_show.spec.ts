import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getUser } from '#tests/helpers'

test.group('Connectors / Show generique', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  test('GET /connectors/:provider — redirige si non authentifie', async ({ client }) => {
    const response = await client.get('/connectors/strava').redirects(0)

    response.assertStatus(302)
  })

  test('GET /connectors/:provider — 200 pour un provider enregistre', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/connectors/strava').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /connectors/:provider — 404 pour un provider inconnu', async ({ client }) => {
    const user = await getUser()

    const response = await client.get('/connectors/inconnu').loginAs(user).redirects(0)

    response.assertStatus(404)
  })

  test('POST /connectors/:provider/disconnect — 404 pour un provider inconnu', async ({
    client,
  }) => {
    const user = await getUser()

    const response = await client.post('/connectors/inconnu/disconnect').loginAs(user).redirects(0)

    response.assertStatus(404)
  })
})
