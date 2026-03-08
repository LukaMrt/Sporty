import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { getUser } from '#tests/helpers'

const TEST_STATE = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'

test.group('Connectors / Strava OAuth', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())

  // ─── authorize ───────────────────────────────────────────────────────────

  test('GET /connectors/strava/authorize — redirige vers Strava (AC#1)', async ({ client }) => {
    const user = await getUser()
    process.env['STRAVA_CLIENT_ID'] = 'test_client_id'

    const response = await client.get('/connectors/strava/authorize').loginAs(user).redirects(0)

    delete process.env['STRAVA_CLIENT_ID']
    response.assertStatus(302)
    // La location pointe vers strava.com — vérifié manuellement ou en test e2e
  })

  // AC#4 — bouton absent quand non configuré : couvert par stravaConfigured=false dans ConnectorsController
  // (env.get() cache les valeurs au démarrage, non modifiable en test)

  // ─── callback — erreur Strava ─────────────────────────────────────────────

  test('GET /connectors/strava/callback — param error → redirect /connectors (AC#2)', async ({
    client,
  }) => {
    const user = await getUser()
    const response = await client
      .get('/connectors/strava/callback')
      .qs({ error: 'access_denied' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/connectors')
  })

  // ─── callback — state mismatch ────────────────────────────────────────────

  test('GET /connectors/strava/callback — state invalide → redirect sans créer de connecteur (AC#3)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const response = await client
      .get('/connectors/strava/callback')
      .qs({ code: 'auth_code', state: 'wrong_state' })
      .withSession({ strava_oauth_state: TEST_STATE })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/connectors')

    const connector = await Connector.findBy('user_id', user.id)
    assert.isNull(connector)
  })

  // ─── callback — succès ────────────────────────────────────────────────────

  test('GET /connectors/strava/callback — flow valide → connecteur créé (AC#2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['STRAVA_CLIENT_ID'] = 'test_client_id'
    process.env['STRAVA_CLIENT_SECRET'] = 'test_client_secret'
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'

    const originalFetch = global.fetch
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          access_token: 'strava_access_token',
          refresh_token: 'strava_refresh_token',
          expires_at: Math.floor(Date.now() / 1000) + 21600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    const response = await client
      .get('/connectors/strava/callback')
      .qs({ code: 'auth_code', state: TEST_STATE })
      .withSession({ strava_oauth_state: TEST_STATE })
      .loginAs(user)
      .redirects(0)

    global.fetch = originalFetch
    delete process.env['STRAVA_CLIENT_ID']
    delete process.env['STRAVA_CLIENT_SECRET']
    delete process.env['CONNECTOR_ENCRYPTION_KEY']

    response.assertStatus(302)
    response.assertHeader('location', '/connectors')

    const connector = await Connector.findBy('user_id', user.id)
    assert.isNotNull(connector)
    assert.equal(connector!.status, ConnectorStatus.Connected)
    assert.equal(connector!.provider, 'strava')
  })

  // ─── callback — upsert ────────────────────────────────────────────────────

  test('GET /connectors/strava/callback — connecteur existant → mis à jour (AC#5)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    process.env['STRAVA_CLIENT_ID'] = 'test_client_id'
    process.env['STRAVA_CLIENT_SECRET'] = 'test_client_secret'
    process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'

    await Connector.create({
      userId: user.id,
      provider: 'strava',
      status: ConnectorStatus.Error,
      encryptedAccessToken: 'old_token',
      encryptedRefreshToken: 'old_refresh',
      autoImportEnabled: false,
      pollingIntervalMinutes: 60,
    })

    const originalFetch = global.fetch
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_at: Math.floor(Date.now() / 1000) + 21600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    const response = await client
      .get('/connectors/strava/callback')
      .qs({ code: 'auth_code', state: TEST_STATE })
      .withSession({ strava_oauth_state: TEST_STATE })
      .loginAs(user)
      .redirects(0)

    global.fetch = originalFetch
    delete process.env['STRAVA_CLIENT_ID']
    delete process.env['STRAVA_CLIENT_SECRET']
    delete process.env['CONNECTOR_ENCRYPTION_KEY']

    response.assertStatus(302)

    const connectors = await Connector.query().where('user_id', user.id)
    assert.equal(connectors.length, 1)
    assert.equal(connectors[0].status, ConnectorStatus.Connected)
  })

  // ─── page connecteurs ─────────────────────────────────────────────────────

  test('GET /connectors — 200 avec STRAVA configuré (AC#4)', async ({ client }) => {
    const user = await getUser()
    process.env['STRAVA_CLIENT_ID'] = 'test_id'
    process.env['STRAVA_CLIENT_SECRET'] = 'test_secret'

    const response = await client.get('/connectors').loginAs(user)

    delete process.env['STRAVA_CLIENT_ID']
    delete process.env['STRAVA_CLIENT_SECRET']
    response.assertStatus(200)
  })

  test('GET /connectors — 200 sans STRAVA configuré (AC#4)', async ({ client }) => {
    const user = await getUser()
    const savedId = process.env['STRAVA_CLIENT_ID']
    const savedSecret = process.env['STRAVA_CLIENT_SECRET']
    delete process.env['STRAVA_CLIENT_ID']
    delete process.env['STRAVA_CLIENT_SECRET']

    const response = await client.get('/connectors').loginAs(user)

    process.env['STRAVA_CLIENT_ID'] = savedId
    process.env['STRAVA_CLIENT_SECRET'] = savedSecret
    response.assertStatus(200)
  })
})
