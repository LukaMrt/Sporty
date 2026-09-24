import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ImportedPlanEntry extends BaseModel {
  static tableName = 'imported_plan_entries'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column.date()
  declare date: DateTime

  @column()
  declare title: string

  @column()
  declare targetDurationMinutes: number | null

  @column()
  declare targetDistanceKm: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
