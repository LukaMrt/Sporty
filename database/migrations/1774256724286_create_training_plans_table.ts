import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'training_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users')
      table
        .integer('goal_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('training_goals')
        .onDelete('SET NULL')
      table.string('methodology').notNullable()
      table.string('plan_type').notNullable()
      table.string('status').notNullable().defaultTo('active')
      table.boolean('auto_recalibrate').notNullable().defaultTo(true)
      table.float('vdot_at_creation').notNullable()
      table.float('current_vdot').notNullable()
      table.integer('sessions_per_week').notNullable()
      table.jsonb('preferred_days').notNullable().defaultTo('[]')
      table.date('start_date').notNullable()
      table.date('end_date').notNullable()
      table.timestamp('last_recalibrated_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
