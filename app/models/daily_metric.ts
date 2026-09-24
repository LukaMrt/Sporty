import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class DailyMetric extends BaseModel {
  static tableName = 'daily_metrics'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column.date()
  declare date: DateTime

  @column()
  declare restingHeartRate: number | null

  @column()
  declare hrvRmssd: number | null

  @column()
  declare sleepMinutes: number | null

  @column()
  declare sleepEfficiency: number | null

  @column()
  declare sleepDeepMinutes: number | null

  @column()
  declare sleepRemMinutes: number | null

  @column()
  declare sleepLightMinutes: number | null

  @column()
  declare sleepAwakeMinutes: number | null

  @column()
  declare sleepScore: number | null

  @column()
  declare steps: number | null

  @column()
  declare activeMinutes: number | null

  @column()
  declare weightKg: number | null

  @column()
  declare bodyFatPercent: number | null

  @column()
  declare respiratoryRate: number | null

  @column()
  declare skinTemperatureDeviation: number | null

  @column()
  declare spo2: number | null

  @column()
  declare vo2Max: number | null

  @column()
  declare source: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
