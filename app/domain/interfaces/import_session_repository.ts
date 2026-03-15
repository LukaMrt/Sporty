import type { ImportSessionStatus } from '#domain/value_objects/import_session_status'

export interface StagingSessionInput {
  externalId: string
  rawData: Record<string, unknown>
}

export interface StagingSessionRecord {
  id: number
  externalId: string
  status: ImportSessionStatus
  rawData: Record<string, unknown> | null
}

export interface ImportedSessionRef {
  externalId: string
  sessionId: number
}

export abstract class ImportSessionRepository {
  abstract upsertMany(connectorId: number, sessions: StagingSessionInput[]): Promise<void>
  abstract findByConnectorId(connectorId: number): Promise<StagingSessionRecord[]>
  abstract findByIds(ids: number[], connectorId: number): Promise<StagingSessionRecord[]>
  abstract setImported(id: number, sessionId: number): Promise<void>
  abstract setIgnored(id: number, userId: number): Promise<void>
  abstract setNew(id: number, userId: number): Promise<void>
  abstract setFailed(id: number, reason: string): Promise<void>
  abstract markImportedBulk(connectorId: number, refs: ImportedSessionRef[]): Promise<void>
}
