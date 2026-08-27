import type { ImportSessionStatus } from '#domain/value_objects/import_session_status'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

export interface ImportSessionConnectorRef {
  connectorId: number
  provider: ConnectorProvider
}

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
  /**
   * Connecteurs distincts auxquels appartiennent ces lignes de staging, restreints
   * a l'utilisateur. Permet de deduire le provider d'un lot d'import sans faire
   * confiance a un parametre client.
   */
  abstract findConnectorsForImportSessions(
    ids: number[],
    userId: number
  ): Promise<ImportSessionConnectorRef[]>
  /** Resets an imported session to 'new' and returns the old importedSessionId (or null). */
  abstract resetForReimport(id: number, userId: number): Promise<number | null>
}
