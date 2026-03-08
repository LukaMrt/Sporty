import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Sport from '#models/sport'

export default class Session extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare sportId: number

  @column.date()
  declare date: DateTime

  @column()
  declare durationMinutes: number

  @column()
  declare distanceKm: number | null

  @column()
  declare avgHeartRate: number | null

  @column()
  declare perceivedEffort: number | null

  @column()
  declare sportMetrics: Record<string, unknown>

  @column()
  declare notes: string | null

  @column()
  declare importedFrom: string | null

  @column()
  declare externalId: string | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Sport)
  declare sport: BelongsTo<typeof Sport>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static withoutTrashed = scope((query) => {
    query.whereNull('deleted_at')
  })

  static onlyTrashed = scope((query) => {
    query.whereNotNull('deleted_at')
  })
}
