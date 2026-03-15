import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import ImportSession from '#models/import_session'
import { TokenEncryption } from '#lib/token_encryption'
import env from '#start/env'
import type { ConnectorProvider } from '#domain/value_objects/connector_provider'
import type { ConnectorStatus } from '#domain/value_objects/connector_status'

export type { ConnectorProvider, ConnectorStatus }

let cachedEncryptionService: TokenEncryption | null | undefined

function getEncryptionService(): TokenEncryption | null {
  if (cachedEncryptionService !== undefined) {
    return cachedEncryptionService
  }

  const key = env.get('CONNECTOR_ENCRYPTION_KEY')
  if (!key) {
    cachedEncryptionService = null
    return null
  }

  cachedEncryptionService = new TokenEncryption(key)
  return cachedEncryptionService
}

export default class Connector extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare provider: ConnectorProvider

  @column()
  declare status: ConnectorStatus

  @column({
    prepare: (value: string | null) => {
      if (value === null) return null
      const svc = getEncryptionService()
      if (!svc) throw new Error('CONNECTOR_ENCRYPTION_KEY is required to store tokens')
      return svc.encrypt(value)
    },
    consume: (value: string | null) => {
      if (value === null) return null
      const svc = getEncryptionService()
      if (!svc) throw new Error('CONNECTOR_ENCRYPTION_KEY is required to read tokens')
      return svc.decrypt(value)
    },
  })
  declare encryptedAccessToken: string | null

  @column({
    prepare: (value: string | null) => {
      if (value === null) return null
      const svc = getEncryptionService()
      if (!svc) throw new Error('CONNECTOR_ENCRYPTION_KEY is required to store tokens')
      return svc.encrypt(value)
    },
    consume: (value: string | null) => {
      if (value === null) return null
      const svc = getEncryptionService()
      if (!svc) throw new Error('CONNECTOR_ENCRYPTION_KEY is required to read tokens')
      return svc.decrypt(value)
    },
  })
  declare encryptedRefreshToken: string | null

  @column.dateTime()
  declare tokenExpiresAt: DateTime | null

  @column()
  declare autoImportEnabled: boolean

  @column()
  declare pollingIntervalMinutes: number

  @column.dateTime()
  declare lastSyncAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => ImportSession)
  declare importSessions: HasMany<typeof ImportSession>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
