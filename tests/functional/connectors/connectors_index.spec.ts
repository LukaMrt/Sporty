import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { getUser } from '#tests/helpers'

test.group('Connectors / Index', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  test('GET /connectors — redirige si non authentifié (AC#1)', async ({ client }) => {
    const response = await client.get('/connectors').redirects(0)

    response.assertStatus(302)
  })

  test('GET /connectors — props Inertia contiennent stravaStatus = null sans connecteur (AC#1, AC#6)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()

    const response = await client
      .get('/connectors')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const body = response.body() as { props: { stravaStatus: unknown; stravaConfigured: unknown } }
    assert.isNull(body.props.stravaStatus)
    // Les tokens ne doivent jamais être exposés (AC#6)
    assert.notProperty(body.props, 'encryptedAccessToken')
    assert.notProperty(body.props, 'encryptedRefreshToken')
  })

  test('GET /connectors — stravaStatus = connected quand connecteur actif (AC#1, AC#2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'
    await Connector.create({
      userId: user.id,
      provider: ConnectorProvider.Strava,
      status: ConnectorStatus.Connected,
      encryptedAccessToken: 'enc_access',
      encryptedRefreshToken: 'enc_refresh',
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    const response = await client
      .get('/connectors')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    delete process.env['CONNECTOR_ENCRYPTION_KEY']
    response.assertStatus(200)
    const body = response.body() as { props: { stravaStatus: string } }
    assert.equal(body.props.stravaStatus, 'connected')
    // AC#6 : tokens absents des props
    assert.notProperty(body.props, 'encryptedAccessToken')
    assert.notProperty(body.props, 'encryptedRefreshToken')
  })

  test('GET /connectors — stravaStatus = error quand erreur de refresh (AC#1, AC#2)', async ({
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
      .get('/connectors')
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    delete process.env['CONNECTOR_ENCRYPTION_KEY']
    response.assertStatus(200)
    const body = response.body() as { props: { stravaStatus: string } }
    assert.equal(body.props.stravaStatus, 'error')
  })
})
