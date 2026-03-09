import type { ImportActivityStatus } from '#domain/value_objects/import_activity_status'

export interface StagingActivityInput {
  externalId: string
  rawData: Record<string, unknown>
}

export interface StagingActivityRecord {
  id: number
  externalId: string
  status: ImportActivityStatus
  rawData: Record<string, unknown> | null
}

export abstract class ImportActivityRepository {
  abstract upsertMany(connectorId: number, activities: StagingActivityInput[]): Promise<void>
  abstract findByConnectorId(connectorId: number): Promise<StagingActivityRecord[]>
  abstract findByIds(ids: number[]): Promise<StagingActivityRecord[]>
  abstract setImported(id: number, sessionId: number): Promise<void>
  abstract setIgnored(id: number): Promise<void>
  abstract setNew(id: number): Promise<void>
}
