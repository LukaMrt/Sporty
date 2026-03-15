import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { getUser } from '#tests/helpers'

test.group('POST /connectors/:provider/settings', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  test('redirige si non authentifié', async ({ client }) => {
    const response = await client
      .post('/connectors/strava/settings')
      .json({ auto_import_enabled: true, polling_interval_minutes: 15 })
      .redirects(0)

    response.assertStatus(302)
  })

  test('retourne 404 pour un provider invalide', async ({ client }) => {
    const user = await getUser()

    const response = await client
      .post('/connectors/invalid-provider/settings')
      .loginAs(user)
      .json({ auto_import_enabled: true, polling_interval_minutes: 15 })

    response.assertStatus(404)
  })

  test('met à jour auto_import_enabled et polling_interval_minutes (AC#2, AC#3)', async ({
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
      pollingIntervalMinutes: 15,
    })

    const response = await client
      .post('/connectors/strava/settings')
      .loginAs(user)
      .json({ auto_import_enabled: true, polling_interval_minutes: 10 })
      .redirects(0)

    delete process.env['CONNECTOR_ENCRYPTION_KEY']

    response.assertStatus(302)

    const connector = await Connector.query()
      .where('user_id', user.id)
      .where('provider', ConnectorProvider.Strava)
      .firstOrFail()

    assert.isTrue(connector.autoImportEnabled)
    assert.equal(connector.pollingIntervalMinutes, 10)
  })

  test('désactive auto import (AC#4)', async ({ client, assert }) => {
    const user = await getUser()
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'

    await Connector.create({
      userId: user.id,
      provider: ConnectorProvider.Strava,
      status: ConnectorStatus.Connected,
      encryptedAccessToken: 'enc_access',
      encryptedRefreshToken: 'enc_refresh',
      autoImportEnabled: true,
      pollingIntervalMinutes: 10,
    })

    const response = await client
      .post('/connectors/strava/settings')
      .loginAs(user)
      .json({ auto_import_enabled: false, polling_interval_minutes: 10 })
      .redirects(0)

    delete process.env['CONNECTOR_ENCRYPTION_KEY']

    response.assertStatus(302)

    const connector = await Connector.query()
      .where('user_id', user.id)
      .where('provider', ConnectorProvider.Strava)
      .firstOrFail()

    assert.isFalse(connector.autoImportEnabled)
  })

  test('retourne 404 si connecteur non trouvé', async ({ client }) => {
    const user = await getUser()

    const response = await client
      .post('/connectors/strava/settings')
      .loginAs(user)
      .json({ auto_import_enabled: true, polling_interval_minutes: 15 })

    response.assertStatus(404)
  })

  test('retourne 422 si intervalle < 5', async ({ client }) => {
    const user = await getUser()

    const response = await client
      .post('/connectors/strava/settings')
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ auto_import_enabled: true, polling_interval_minutes: 3 })

    response.assertStatus(422)
  })

  test('retourne 422 si intervalle > 60', async ({ client }) => {
    const user = await getUser()

    const response = await client
      .post('/connectors/strava/settings')
      .loginAs(user)
      .header('Accept', 'application/json')
      .json({ auto_import_enabled: true, polling_interval_minutes: 120 })

    response.assertStatus(422)
  })
})
