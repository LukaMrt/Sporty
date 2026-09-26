import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Données Open Wearables supplémentaires : horaires et qualité de la nuit,
 * scores calculés par la montre, FC de récupération et activité hors séances.
 */
export default class extends BaseSchema {
  protected tableName = 'daily_metrics'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('sleep_bedtime_minutes').nullable()
      table.integer('sleep_wake_minutes').nullable()
      table.integer('sleep_interruptions').nullable()
      table.integer('nap_minutes').nullable()
      table.float('sleep_heart_rate').nullable()
      table.float('readiness_score').nullable()
      table.float('recovery_score').nullable()
      table.float('body_battery').nullable()
      table.float('stress_score').nullable()
      table.float('strain_score').nullable()
      table.float('heart_rate_recovery').nullable()
      table.float('active_calories_kcal').nullable()
      table.integer('sedentary_minutes').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns(
        'sleep_bedtime_minutes',
        'sleep_wake_minutes',
        'sleep_interruptions',
        'nap_minutes',
        'sleep_heart_rate',
        'readiness_score',
        'recovery_score',
        'body_battery',
        'stress_score',
        'strain_score',
        'heart_rate_recovery',
        'active_calories_kcal',
        'sedentary_minutes'
      )
    })
  }
}
