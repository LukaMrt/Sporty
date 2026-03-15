import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { getUser } from '#tests/helpers'

test.group('Import / Activities', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  test('GET /connectors/strava — redirige si non authentifié', async ({ client }) => {
    const response = await client.get('/connectors/strava').redirects(0)
    response.assertStatus(302)
  })

  test('GET /connectors/strava — activities null si pas de connecteur', async ({
    client,
    assert,
  }) => {
    const user = await getUser()

    const response = await client
      .get('/connectors/strava')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const body = response.body() as { props: { stravaStatus: null; activities: null } }
    assert.isNull(body.props.stravaStatus)
    assert.isNull(body.props.activities)
  })

  test('GET /connectors/strava — activities tableau vide et connectorError=true si connecteur en erreur (AC#2 story 10.1)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'
    await Connector.create({
      userId: user.id,
      provider: ConnectorProvider.Strava,
      status: ConnectorStatus.Error,
      encryptedAccessToken: 'enc_access',
      encryptedRefreshToken: 'enc_refresh',
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    const response = await client
      .get('/connectors/strava')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    delete process.env['CONNECTOR_ENCRYPTION_KEY']
    response.assertStatus(200)
    const body = response.body() as {
      props: { stravaStatus: string; activities: unknown[] | null; connectorError: boolean }
    }
    assert.equal(body.props.stravaStatus, 'error')
    assert.isArray(body.props.activities) // tableau (vide car aucune activité en staging)
    assert.isTrue(body.props.connectorError)
  })
})
