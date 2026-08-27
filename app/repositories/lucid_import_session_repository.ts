import ImportSessionModel from '#models/import_session'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type {
  StagingSessionInput,
  StagingSessionRecord,
  ImportedSessionRef,
  ImportSessionConnectorRef,
} from '#domain/interfaces/import_session_repository'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'

export default class LucidImportSessionRepository extends ImportSessionRepository {
  async upsertMany(connectorId: number, sessions: StagingSessionInput[]): Promise<void> {
    await Promise.all(
      sessions.map(async (session) => {
        const existing = await ImportSessionModel.query()
          .where('connector_id', connectorId)
          .where('external_id', session.externalId)
          .first()

        if (!existing) {
          await ImportSessionModel.create({
            connectorId,
            externalId: session.externalId,
            rawData: session.rawData,
            status: ImportSessionStatus.New,
          })
          return
        }

        // Rafraîchir uniquement le staging non traité : une ligne imported/ignored/failed
        // ne doit jamais être écrasée par une nouvelle passe de listSessions.
        if (existing.status !== ImportSessionStatus.New) return

        existing.rawData = session.rawData
        await existing.save()
      })
    )
  }

  async findByConnectorId(connectorId: number): Promise<StagingSessionRecord[]> {
    const rows = await ImportSessionModel.query().where('connector_id', connectorId)
    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId,
      status: row.status,
      rawData: row.rawData,
    }))
  }

  async findByIds(ids: number[], connectorId: number): Promise<StagingSessionRecord[]> {
    const rows = await ImportSessionModel.query()
      .whereIn('id', ids)
      .where('connector_id', connectorId)
    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId,
      status: row.status,
      rawData: row.rawData,
    }))
  }

  async setImported(id: number, sessionId: number): Promise<void> {
    await ImportSessionModel.query()
      .where('id', id)
      .update({ status: ImportSessionStatus.Imported, importedSessionId: sessionId })
  }

  async setIgnored(id: number, userId: number): Promise<void> {
    await ImportSessionModel.query()
      .where('id', id)
      .whereHas('connector', (q) => {
        void q.where('user_id', userId)
      })
      .update({ status: ImportSessionStatus.Ignored })
  }

  async setNew(id: number, userId: number): Promise<void> {
    await ImportSessionModel.query()
      .where('id', id)
      .whereHas('connector', (q) => {
        void q.where('user_id', userId)
      })
      .update({ status: ImportSessionStatus.New })
  }

  async setFailed(id: number, _reason: string): Promise<void> {
    await ImportSessionModel.query().where('id', id).update({ status: ImportSessionStatus.Failed })
  }

  async resetForReimport(id: number, userId: number): Promise<number | null> {
    const row = await ImportSessionModel.query()
      .where('id', id)
      .whereHas('connector', (q) => {
        void q.where('user_id', userId)
      })
      .first()
    if (!row) return null
    const oldSessionId = row.importedSessionId
    row.status = ImportSessionStatus.New
    row.importedSessionId = null
    await row.save()
    return oldSessionId
  }

  async findConnectorsForImportSessions(
    ids: number[],
    userId: number
  ): Promise<ImportSessionConnectorRef[]> {
    if (ids.length === 0) return []
    const rows = await ImportSessionModel.query()
      .whereIn('id', ids)
      .whereHas('connector', (q) => {
        void q.where('user_id', userId)
      })
      .preload('connector')

    const byConnectorId = new Map<number, ImportSessionConnectorRef>()
    for (const row of rows) {
      byConnectorId.set(row.connectorId, {
        connectorId: row.connectorId,
        provider: row.connector.provider,
      })
    }
    return [...byConnectorId.values()]
  }

  async markImportedBulk(connectorId: number, refs: ImportedSessionRef[]): Promise<void> {
    if (refs.length === 0) return
    await Promise.all(
      refs.map((ref) =>
        ImportSessionModel.query()
          .where('connector_id', connectorId)
          .where('external_id', ref.externalId)
          .update({ status: ImportSessionStatus.Imported, importedSessionId: ref.sessionId })
      )
    )
  }
}
