import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import Session from '#models/session'
import Sport from '#models/sport'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { getUser } from '#tests/helpers'
import { DateTime } from 'luxon'

// ConnectorStatus utilisé pour créer les fixtures (connected / error)

test.group('Connectors / Strava Disconnect', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  // ─── AC#2 — déconnexion réussie ───────────────────────────────────────────

  test('POST /connectors/strava/disconnect — passe le connecteur en disconnected (AC#2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'

    await Connector.create({
      userId: user.id,
      provider: 'strava',
      status: ConnectorStatus.Connected,
      encryptedAccessToken: 'access_token',
      encryptedRefreshToken: 'refresh_token',
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    // Mock fetch — simule Strava disponible
    const originalFetch = global.fetch
    global.fetch = async () => new Response('{}', { status: 200 })

    const response = await client.post('/connectors/strava/disconnect').loginAs(user).redirects(0)

    global.fetch = originalFetch
    delete process.env['CONNECTOR_ENCRYPTION_KEY']

    response.assertStatus(302)
    response.assertHeader('location', '/connectors')

    const connector = await Connector.findBy('user_id', user.id)
    assert.isNull(connector)
  })

  // ─── AC#5 — déconnexion locale même si Strava indisponible ───────────────

  test('POST /connectors/strava/disconnect — tokens supprimés même si Strava échoue (AC#5)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'

    await Connector.create({
      userId: user.id,
      provider: 'strava',
      status: ConnectorStatus.Connected,
      encryptedAccessToken: 'access_token',
      encryptedRefreshToken: 'refresh_token',
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    // Mock fetch — simule Strava indisponible
    const originalFetch = global.fetch
    global.fetch = async () => {
      throw new Error('Network error')
    }

    const response = await client.post('/connectors/strava/disconnect').loginAs(user).redirects(0)

    global.fetch = originalFetch
    delete process.env['CONNECTOR_ENCRYPTION_KEY']

    response.assertStatus(302)
    response.assertHeader('location', '/connectors')

    const connector = await Connector.findBy('user_id', user.id)
    assert.isNull(connector)
  })

  // ─── AC#2 — non authentifié ───────────────────────────────────────────────

  test('POST /connectors/strava/disconnect — non authentifié → 302 login', async ({ client }) => {
    const response = await client.post('/connectors/strava/disconnect').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  // ─── AC#1 — page connecteurs expose stravaStatus (connected) ─────────────

  test('GET /connectors — stravaStatus=connected si connecteur connected (AC#1)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['STRAVA_CLIENT_ID'] = 'test_id'
    process.env['STRAVA_CLIENT_SECRET'] = 'test_secret'

    await Connector.create({
      userId: user.id,
      provider: 'strava',
      status: ConnectorStatus.Connected,
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    const response = await client.get('/connectors').loginAs(user)

    delete process.env['STRAVA_CLIENT_ID']
    delete process.env['STRAVA_CLIENT_SECRET']

    response.assertStatus(200)
    assert.include(response.text(), 'connected')
  })

  // ─── AC#1 story 10.3 — sessions survivent à la déconnexion ──────────────

  test('POST /connectors/strava/disconnect — les sessions importées restent intactes (AC#1 story 10.3)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'

    const connector = await Connector.create({
      userId: user.id,
      provider: ConnectorProvider.Strava,
      status: ConnectorStatus.Connected,
      encryptedAccessToken: 'access_token',
      encryptedRefreshToken: 'refresh_token',
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    // Créer une session importée depuis ce connecteur
    const sport = await Sport.firstOrFail()
    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.now(),
      durationMinutes: 45,
      distanceKm: 10,
      avgHeartRate: null,
      perceivedEffort: null,
      sportMetrics: {},
      notes: null,
      importedFrom: 'strava',
      externalId: 'ext-999',
    })

    const originalFetch = global.fetch
    global.fetch = async () => new Response('{}', { status: 200 })

    await client.post('/connectors/strava/disconnect').loginAs(user).redirects(0)

    global.fetch = originalFetch
    delete process.env['CONNECTOR_ENCRYPTION_KEY']

    // Le connecteur est supprimé
    const connectorAfter = await Connector.findBy('user_id', user.id)
    assert.isNull(connectorAfter)

    // Mais la session reste intacte
    const sessionAfter = await Session.find(session.id)
    assert.isNotNull(sessionAfter)
    assert.equal(sessionAfter!.importedFrom, 'strava')
    assert.equal(sessionAfter!.externalId, 'ext-999')

    // La FK connector n'affecte pas les sessions (pas de cascade)
    void connector // used
  })

  // ─── AC#3 — page connecteurs expose stravaStatus (error) ─────────────────

  test('GET /connectors — stravaStatus=error si connecteur en erreur (AC#3)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['STRAVA_CLIENT_ID'] = 'test_id'
    process.env['STRAVA_CLIENT_SECRET'] = 'test_secret'

    await Connector.create({
      userId: user.id,
      provider: 'strava',
      status: ConnectorStatus.Error,
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    const response = await client.get('/connectors').loginAs(user)

    delete process.env['STRAVA_CLIENT_ID']
    delete process.env['STRAVA_CLIENT_SECRET']

    response.assertStatus(200)
    assert.include(response.text(), 'error')
  })
})
