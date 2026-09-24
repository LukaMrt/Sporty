import type { ImportSessionStatus } from '#domain/value_objects/import_session_status'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'

export type ImportSessionConnectorRef = {
  connectorId: number
  provider: ConnectorProvider
}

export type StagingSessionInput = {
  externalId: string
  rawData: Record<string, unknown>
}

export type StagingSessionRecord = {
  id: number
  externalId: string
  status: ImportSessionStatus
  rawData: Record<string, unknown> | null
  failureReason?: string | null
  failedAttempts?: number
}

export type ImportedSessionRef = {
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
  /**
   * Enregistre un échec transitoire ; passe la ligne en `failed` au bout de
   * `maxAttempts` échecs pour ne plus la re-tenter à chaque synchro.
   * Renvoie `true` si la ligne est désormais en échec définitif.
   */
  abstract recordFailure(id: number, reason: string, maxAttempts: number): Promise<boolean>
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
