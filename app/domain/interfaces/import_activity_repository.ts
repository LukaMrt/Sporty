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

export interface ImportedActivityRef {
  externalId: string
  sessionId: number
}

export abstract class ImportActivityRepository {
  abstract upsertMany(connectorId: number, activities: StagingActivityInput[]): Promise<void>
  abstract findByConnectorId(connectorId: number): Promise<StagingActivityRecord[]>
  abstract findByIds(ids: number[], connectorId: number): Promise<StagingActivityRecord[]>
  abstract setImported(id: number, sessionId: number): Promise<void>
  abstract setIgnored(id: number, userId: number): Promise<void>
  abstract setNew(id: number, userId: number): Promise<void>
  abstract setFailed(id: number, reason: string): Promise<void>
  abstract markImportedBulk(connectorId: number, refs: ImportedActivityRef[]): Promise<void>
}
