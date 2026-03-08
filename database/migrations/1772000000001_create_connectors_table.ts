import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'connectors'

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
      table.string('provider').notNullable()
      table.string('status').notNullable()
      table.text('encrypted_access_token').nullable()
      table.text('encrypted_refresh_token').nullable()
      table.timestamp('token_expires_at').nullable()
      table.boolean('auto_import_enabled').notNullable().defaultTo(false)
      table.integer('polling_interval_minutes').notNullable().defaultTo(15)
      table.timestamp('last_sync_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'provider'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
