import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import ImportActivity from '#models/import_activity'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'
import { getUser } from '#tests/helpers'

async function createConnectorWithActivity(
  userId: number,
  status: ImportActivityStatus = ImportActivityStatus.New
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
  const activity = await ImportActivity.create({
    connectorId: connector.id,
    externalId: 'ext-123',
    status,
    rawData: null,
  })
  return { connector, activity }
}

test.group('Import / Ignore & Restore', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())
  group.each.teardown(() => {
    delete process.env['CONNECTOR_ENCRYPTION_KEY']
  })

  // ─── Ignore ───────────────────────────────────────────────────────────────

  test('POST /import/activities/:id/ignore — redirige si non authentifié', async ({ client }) => {
    const response = await client.post('/import/activities/1/ignore').redirects(0)
    response.assertStatus(302)
  })

  test('POST /import/activities/:id/ignore — passe le statut a ignored (AC#1)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const { activity } = await createConnectorWithActivity(user.id, ImportActivityStatus.New)

    const response = await client.post(`/import/activities/${activity.id}/ignore`).loginAs(user)

    response.assertStatus(200)

    const updated = await ImportActivity.findOrFail(activity.id)
    assert.equal(updated.status, ImportActivityStatus.Ignored)
  })

  // ─── Restore ──────────────────────────────────────────────────────────────

  test('POST /import/activities/:id/restore — redirige si non authentifié', async ({ client }) => {
    const response = await client.post('/import/activities/1/restore').redirects(0)
    response.assertStatus(302)
  })

  test('POST /import/activities/:id/restore — repasse le statut a new (AC#2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const { activity } = await createConnectorWithActivity(user.id, ImportActivityStatus.Ignored)

    const response = await client.post(`/import/activities/${activity.id}/restore`).loginAs(user)

    response.assertStatus(200)

    const updated = await ImportActivity.findOrFail(activity.id)
    assert.equal(updated.status, ImportActivityStatus.New)
  })
})
