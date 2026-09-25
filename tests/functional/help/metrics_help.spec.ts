import { test } from '@japa/runner'
import { getUser } from '#tests/helpers'

test.group('Aide / Métriques', () => {
  test('GET /help/metrics — redirige si non authentifié', async ({ client }) => {
    const response = await client.get('/help/metrics').redirects(0)
    response.assertStatus(302)
  })

  test('GET /help/metrics — rend la page avec les traductions du glossaire', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const response = await client
      .get('/help/metrics')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const body = response.body() as {
      component: string
      props: { translations: Record<string, string> }
    }
    assert.equal(body.component, 'Help/Metrics')
    // Clés plates : « glossary.terms.ctl.name » n'est pas un chemin imbriqué
    assert.isString(body.props.translations['glossary.terms.ctl.name'])
  })
})
