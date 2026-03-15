import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import ImportSession from '#models/import_session'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'
import { getUser } from '#tests/helpers'

async function createConnectorWithSession(
  userId: number,
  status: ImportSessionStatus = ImportSessionStatus.New
) {
  process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'
  const connector = await Connector.create({
    userId,
    provider: ConnectorProvider.Strava,
    status: ConnectorStatus.Connected,
    encryptedAccessToken: 'enc_access',
    encryptedRefreshToken: 'enc_refresh',
    autoImportEnabled: false,
    pollingIntervalMinutes: 60,
  })
  const session = await ImportSession.create({
    connectorId: connector.id,
    externalId: 'ext-123',
    status,
    rawData: null,
  })
  return { connector, session }
}

test.group('Import / Ignore & Restore', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())
  group.each.teardown(() => {
    delete process.env['CONNECTOR_ENCRYPTION_KEY']
  })

  // ─── Ignore ───────────────────────────────────────────────────────────────

  test('POST /import/sessions/:id/ignore — redirige si non authentifié', async ({ client }) => {
    const response = await client.post('/import/sessions/1/ignore').redirects(0)
    response.assertStatus(302)
  })

  test('POST /import/sessions/:id/ignore — passe le statut a ignored (AC#1)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const { session } = await createConnectorWithSession(user.id, ImportSessionStatus.New)

    const response = await client.post(`/import/sessions/${session.id}/ignore`).loginAs(user)

    response.assertStatus(200)

    const updated = await ImportSession.findOrFail(session.id)
    assert.equal(updated.status, ImportSessionStatus.Ignored)
  })

  // ─── Restore ──────────────────────────────────────────────────────────────

  test('POST /import/sessions/:id/restore — redirige si non authentifié', async ({ client }) => {
    const response = await client.post('/import/sessions/1/restore').redirects(0)
    response.assertStatus(302)
  })

  test('POST /import/sessions/:id/restore — repasse le statut a new (AC#2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const { session } = await createConnectorWithSession(user.id, ImportSessionStatus.Ignored)

    const response = await client.post(`/import/sessions/${session.id}/restore`).loginAs(user)

    response.assertStatus(200)

    const updated = await ImportSession.findOrFail(session.id)
    assert.equal(updated.status, ImportSessionStatus.New)
  })
})
