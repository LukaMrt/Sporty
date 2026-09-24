import { BaseSchema } from '@adonisjs/lucid/schema'

/** Séances prévues d'un plan rédigé ailleurs (projet Claude), affichées face au réalisé (H3) */
export default class extends BaseSchema {
  protected tableName = 'imported_plan_entries'

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
      table.string('title', 200).notNullable()
      table.integer('target_duration_minutes').nullable()
      table.float('target_distance_km').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
