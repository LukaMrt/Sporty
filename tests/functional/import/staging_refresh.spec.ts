import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Connector from '#models/connector'
import ImportSession from '#models/import_session'
import LucidImportSessionRepository from '#repositories/lucid_import_session_repository'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import { ConnectorProvider } from '#domain/value_objects/connector_provider'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'
import { getUser } from '#tests/helpers'

const EXTERNAL_ID = 'ext-refresh-1'

async function createConnector(userId: number) {
  process.env['CONNECTOR_ENCRYPTION_KEY'] = 'test_encryption_key_32_bytes_long!!'
  return Connector.create({
    userId,
    provider: ConnectorProvider.Strava,
    status: ConnectorStatus.Connected,
    encryptedAccessToken: 'enc_access',
    encryptedRefreshToken: 'enc_refresh',
    autoImportEnabled: false,
    pollingIntervalMinutes: 60,
  })
}

test.group('Import / Rafraichissement du staging', (group) => {
  group.each.setup(async () => testUtils.db().wrapInGlobalTransaction())
  group.each.teardown(() => {
    delete process.env['CONNECTOR_ENCRYPTION_KEY']
  })

  test('upsertMany cree la ligne absente', async ({ assert }) => {
    const user = await getUser()
    const connector = await createConnector(user.id)
    const repository = new LucidImportSessionRepository()

    await repository.upsertMany(connector.id, [
      { externalId: EXTERNAL_ID, rawData: { durationMinutes: 42 } },
    ])

    const row = await ImportSession.query()
      .where('connector_id', connector.id)
      .where('external_id', EXTERNAL_ID)
      .firstOrFail()
    assert.equal(row.status, ImportSessionStatus.New)
    assert.deepEqual(row.rawData, { durationMinutes: 42 })
  })

  test('upsertMany rafraichit le rawData d une ligne en statut new', async ({ assert }) => {
    const user = await getUser()
    const connector = await createConnector(user.id)
    const repository = new LucidImportSessionRepository()

    await repository.upsertMany(connector.id, [
      { externalId: EXTERNAL_ID, rawData: { durationMinutes: 210, distanceKm: null } },
    ])
    await repository.upsertMany(connector.id, [
      { externalId: EXTERNAL_ID, rawData: { durationMinutes: 178, distanceKm: 9.05 } },
    ])

    const rows = await ImportSession.query()
      .where('connector_id', connector.id)
      .where('external_id', EXTERNAL_ID)
    assert.lengthOf(rows, 1)
    assert.deepEqual(rows[0].rawData, { durationMinutes: 178, distanceKm: 9.05 })
  })

  test('upsertMany n ecrase pas une ligne deja importee', async ({ assert }) => {
    const user = await getUser()
    const connector = await createConnector(user.id)
    const repository = new LucidImportSessionRepository()

    await ImportSession.create({
      connectorId: connector.id,
      externalId: EXTERNAL_ID,
      status: ImportSessionStatus.Imported,
      rawData: { durationMinutes: 178 },
    })

    await repository.upsertMany(connector.id, [
      { externalId: EXTERNAL_ID, rawData: { durationMinutes: 999 } },
    ])

    const row = await ImportSession.query()
      .where('connector_id', connector.id)
      .where('external_id', EXTERNAL_ID)
      .firstOrFail()
    assert.equal(row.status, ImportSessionStatus.Imported)
    assert.deepEqual(row.rawData, { durationMinutes: 178 })
  })

  test('upsertMany n ecrase pas une ligne ignoree', async ({ assert }) => {
    const user = await getUser()
    const connector = await createConnector(user.id)
    const repository = new LucidImportSessionRepository()

    await ImportSession.create({
      connectorId: connector.id,
      externalId: EXTERNAL_ID,
      status: ImportSessionStatus.Ignored,
      rawData: { durationMinutes: 178 },
    })

    await repository.upsertMany(connector.id, [
      { externalId: EXTERNAL_ID, rawData: { durationMinutes: 999 } },
    ])

    const row = await ImportSession.query()
      .where('connector_id', connector.id)
      .where('external_id', EXTERNAL_ID)
      .firstOrFail()
    assert.equal(row.status, ImportSessionStatus.Ignored)
    assert.deepEqual(row.rawData, { durationMinutes: 178 })
  })
})
