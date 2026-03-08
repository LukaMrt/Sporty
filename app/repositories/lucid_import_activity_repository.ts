import ImportActivityModel from '#models/import_activity'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import type {
  StagingActivityInput,
  StagingActivityRecord,
} from '#domain/interfaces/import_activity_repository'
import { ImportActivityStatus } from '#domain/value_objects/import_activity_status'

export default class LucidImportActivityRepository extends ImportActivityRepository {
  async upsertMany(connectorId: number, activities: StagingActivityInput[]): Promise<void> {
    for (const activity of activities) {
      await ImportActivityModel.firstOrCreate(
        { connectorId, externalId: activity.externalId },
        { rawData: activity.rawData, status: ImportActivityStatus.New }
      )
    }
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
}
