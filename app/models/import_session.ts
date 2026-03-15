import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Connector from '#models/connector'
import Session from '#models/session'
import type { ImportSessionStatus } from '#domain/value_objects/import_session_status'

export type { ImportSessionStatus }

export default class ImportSession extends BaseModel {
  static tableName = 'import_sessions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare connectorId: number

  @column()
  declare externalId: string

  @column()
  declare status: ImportSessionStatus

  @column()
  declare rawData: Record<string, unknown> | null

  @column()
  declare importedSessionId: number | null

  @belongsTo(() => Connector)
  declare connector: BelongsTo<typeof Connector>

  @belongsTo(() => Session, { foreignKey: 'importedSessionId' })
  declare importedSession: BelongsTo<typeof Session>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
