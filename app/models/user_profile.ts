import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import type { UserLevel } from '#domain/entities/user_profile'
import type { UserPreferences } from '#domain/entities/user_preferences'
import type { BiologicalSex, TrainingState } from '#domain/value_objects/planning_types'
import type { HrZonesConfig } from '#domain/value_objects/heart_rate_zones_config'

export default class UserProfile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare level: UserLevel | null

  @column()
  declare objective: string | null

  @column()
  declare preferences: UserPreferences

  @column()
  declare maxHeartRate: number | null

  @column()
  declare restingHeartRate: number | null

  @column()
  declare vma: number | null

  @column()
  declare sex: BiologicalSex | null

  @column()
  declare trainingState: TrainingState

  @column({
    prepare: (value: HrZonesConfig | null) => (value ? JSON.stringify(value) : null),
  })
  declare hrZonesConfig: HrZonesConfig | null

  @column()
  declare vdot: number | null

  @column()
  declare timezone: string | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
