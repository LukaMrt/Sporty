import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { TrainingGoalStatus } from '#domain/entities/training_goal'

export default class TrainingGoal extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare targetDistanceKm: number

  @column()
  declare targetTimeMinutes: number | null

  @column.date()
  declare eventDate: DateTime | null

  @column()
  declare status: TrainingGoalStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
