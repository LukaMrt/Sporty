import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'planned_weeks'

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
      table.string('phase_name').notNullable()
      table.string('phase_label').notNullable()
      table.boolean('is_recovery_week').notNullable().defaultTo(false)
      table.integer('target_volume_minutes').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['plan_id', 'week_number'])
      table.index('plan_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
