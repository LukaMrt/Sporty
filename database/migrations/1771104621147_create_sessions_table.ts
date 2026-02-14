import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('sport_type').notNullable()
      table.date('date').notNullable()
      table.integer('duration_minutes').notNullable()
      table.decimal('distance_km', 8, 2).nullable()
      table.integer('avg_heart_rate').nullable()
      table.integer('perceived_effort').nullable()
      table.jsonb('sport_metrics').notNullable().defaultTo('{}')
      table.timestamp('deleted_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index('user_id', 'idx_sessions_user_id')
      table.index('sport_type', 'idx_sessions_sport_type')
      table.index('deleted_at', 'idx_sessions_deleted_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
