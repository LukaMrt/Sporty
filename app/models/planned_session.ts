import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type {
  SessionType,
  IntensityZone,
  PlannedSessionStatus,
} from '#domain/value_objects/planning_types'
import type { IntervalBlock } from '#domain/entities/planned_session'
import TrainingPlan from '#models/training_plan'

export default class PlannedSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare weekNumber: number

  @column()
  declare dayOfWeek: number

  @column()
  declare sessionType: SessionType

  @column()
  declare description: string

  @column()
  declare targetDurationMinutes: number

  @column()
  declare targetDistanceKm: number | null

  @column()
  declare targetPacePerKm: string | null

  @column()
  declare intensityZone: IntensityZone

  @column()
  declare intervals: IntervalBlock[] | null

  @column()
  declare targetLoadTss: number | null

  @column()
  declare completedSessionId: number | null

  @column()
  declare status: PlannedSessionStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => TrainingPlan)
  declare plan: BelongsTo<typeof TrainingPlan>
}
