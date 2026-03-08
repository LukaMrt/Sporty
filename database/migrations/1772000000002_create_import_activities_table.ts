import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'import_activities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('connector_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('connectors')
        .onDelete('CASCADE')
      table.string('external_id').notNullable()
      table.string('status').notNullable()
      table.jsonb('raw_data').nullable()
      table
        .integer('imported_session_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('sessions')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['connector_id', 'external_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
