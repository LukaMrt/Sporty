import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type {
  SessionType,
  IntensityZone,
  PlannedSessionStatus,
} from '#domain/value_objects/planning_types'
import type { IntervalBlock, StrengthExercise } from '#domain/entities/planned_session'
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
  declare sportSlug: string

  @column()
  declare title: string | null

  @column()
  declare description: string

  @column()
  declare targetDurationMinutes: number

  @column()
  declare targetDistanceKm: number | null

  @column()
  declare targetPacePerKm: string | null

  // Nom explicite : la conversion snake_case donnerait `target_pace_per_100_m`
  @column({ columnName: 'target_pace_per_100m' })
  declare targetPacePer100m: string | null

  @column()
  declare targetPowerWatts: number | null

  @column()
  declare targetRpe: number | null

  @column({
    prepare: (value: StrengthExercise[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | StrengthExercise[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as StrengthExercise[]) : value,
  })
  declare exercises: StrengthExercise[] | null

  @column()
  declare orderInDay: number

  @column()
  declare intensityZone: IntensityZone

  @column({
    prepare: (value: IntervalBlock[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | IntervalBlock[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as IntervalBlock[]) : value,
  })
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
