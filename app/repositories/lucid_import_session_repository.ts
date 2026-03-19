import ImportSessionModel from '#models/import_session'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import type {
  StagingSessionInput,
  StagingSessionRecord,
  ImportedSessionRef,
} from '#domain/interfaces/import_session_repository'
import { ImportSessionStatus } from '#domain/value_objects/import_session_status'

export default class LucidImportSessionRepository extends ImportSessionRepository {
  async upsertMany(connectorId: number, sessions: StagingSessionInput[]): Promise<void> {
    await Promise.all(
      sessions.map((session) =>
        ImportSessionModel.firstOrCreate(
          { connectorId, externalId: session.externalId },
          { rawData: session.rawData, status: ImportSessionStatus.New }
        )
      )
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
