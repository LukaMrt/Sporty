import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { PlanMethodology, PlanType, PlanStatus } from '#domain/entities/training_plan'
import TrainingGoal from '#models/training_goal'
import PlannedWeek from '#models/planned_week'
import PlannedSession from '#models/planned_session'

export default class TrainingPlan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare goalId: number | null

  @column()
  declare methodology: PlanMethodology

  @column()
  declare planType: PlanType

  @column()
  declare status: PlanStatus

  @column()
  declare autoRecalibrate: boolean

  @column()
  declare vdotAtCreation: number

  @column()
  declare currentVdot: number

  @column()
  declare sessionsPerWeek: number

  @column()
  declare preferredDays: number[]

  @column.date()
  declare startDate: DateTime

  @column.date()
  declare endDate: DateTime

  @column.dateTime()
  declare lastRecalibratedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => TrainingGoal)
  declare goal: BelongsTo<typeof TrainingGoal>

  @hasMany(() => PlannedWeek)
  declare weeks: HasMany<typeof PlannedWeek>

  @hasMany(() => PlannedSession)
  declare sessions: HasMany<typeof PlannedSession>
}
