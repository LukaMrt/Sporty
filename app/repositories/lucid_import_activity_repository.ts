import ImportActivityModel from '#models/import_activity'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type {
  StagingActivityInput,
  StagingActivityRecord,
  ImportedActivityRef,
} from '#domain/interfaces/import_activity_repository'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'

export default class LucidImportActivityRepository extends ImportActivityRepository {
  async upsertMany(connectorId: number, activities: StagingActivityInput[]): Promise<void> {
    await Promise.all(
      activities.map((activity) =>
        ImportActivityModel.firstOrCreate(
          { connectorId, externalId: activity.externalId },
          { rawData: activity.rawData, status: ImportActivityStatus.New }
        )
      )
    )
  }

  async findByConnectorId(connectorId: number): Promise<StagingActivityRecord[]> {
    const rows = await ImportActivityModel.query().where('connector_id', connectorId)
    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId,
      status: row.status,
      rawData: row.rawData,
    }))
  }

  async findByIds(ids: number[], connectorId: number): Promise<StagingActivityRecord[]> {
    const rows = await ImportActivityModel.query()
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
    await ImportActivityModel.query()
      .where('id', id)
      .update({ status: ImportActivityStatus.Imported, importedSessionId: sessionId })
  }

  async setIgnored(id: number, userId: number): Promise<void> {
    await ImportActivityModel.query()
      .where('id', id)
      .whereHas('connector', (q) => {
        void q.where('user_id', userId)
      })
      .update({ status: ImportActivityStatus.Ignored })
  }

  async setNew(id: number, userId: number): Promise<void> {
    await ImportActivityModel.query()
      .where('id', id)
      .whereHas('connector', (q) => {
        void q.where('user_id', userId)
      })
      .update({ status: ImportActivityStatus.New })
  }

  async setFailed(id: number, _reason: string): Promise<void> {
    await ImportActivityModel.query()
      .where('id', id)
      .update({ status: ImportActivityStatus.Failed })
  }

  async markImportedBulk(connectorId: number, refs: ImportedActivityRef[]): Promise<void> {
    if (refs.length === 0) return
    await Promise.all(
      refs.map((ref) =>
        ImportActivityModel.query()
          .where('connector_id', connectorId)
          .where('external_id', ref.externalId)
          .update({ status: ImportActivityStatus.Imported, importedSessionId: ref.sessionId })
      )
    )
  }
}
