import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Session extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare sportType: string

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

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

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
