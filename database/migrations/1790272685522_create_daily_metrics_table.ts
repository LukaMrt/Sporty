import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Métriques quotidiennes de récupération et de santé (Open Wearables).
 * La charge (TSS/CTL/ATL) n'y est pas stockée : elle se recalcule en une requête
 * légère depuis `sessions.training_load`.
 */
export default class extends BaseSchema {
  protected tableName = 'daily_metrics'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.date('date').notNullable()
      table.float('resting_heart_rate').nullable()
      table.float('hrv_rmssd').nullable()
      table.integer('sleep_minutes').nullable()
      table.float('sleep_efficiency').nullable()
      table.integer('sleep_deep_minutes').nullable()
      table.integer('sleep_rem_minutes').nullable()
      table.integer('sleep_light_minutes').nullable()
      table.integer('sleep_awake_minutes').nullable()
      table.float('sleep_score').nullable()
      table.integer('steps').nullable()
      table.integer('active_minutes').nullable()
      table.float('weight_kg').nullable()
      table.float('body_fat_percent').nullable()
      table.float('respiratory_rate').nullable()
      table.float('skin_temperature_deviation').nullable()
      table.float('spo2').nullable()
      table.float('vo2_max').nullable()
      table.string('source').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
