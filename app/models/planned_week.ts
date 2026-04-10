import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import TrainingPlan from '#models/training_plan'

export default class PlannedWeek extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare weekNumber: number

  @column()
  declare phaseName: string

  @column()
  declare phaseLabel: string

  @column()
  declare isRecoveryWeek: boolean

  @column()
  declare targetVolumeMinutes: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => TrainingPlan)
  declare plan: BelongsTo<typeof TrainingPlan>
}
