import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'planned_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('plan_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('training_plans')
        .onDelete('CASCADE')
      table.integer('week_number').notNullable()
      table.integer('day_of_week').notNullable()
      table.string('session_type').notNullable()
      table.string('description').notNullable()
      table.integer('target_duration_minutes').notNullable()
      table.float('target_distance_km').nullable()
      table.string('target_pace_per_km').nullable()
      table.string('intensity_zone').notNullable()
      table.jsonb('intervals').nullable()
      table.float('target_load_tss').nullable()
      table
        .integer('completed_session_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('sessions')
        .onDelete('SET NULL')
      table.string('status').notNullable().defaultTo('pending')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['plan_id', 'week_number'])
      table.index('completed_session_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
