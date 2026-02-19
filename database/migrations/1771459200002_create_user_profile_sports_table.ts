import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_profile_sports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_profile_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('user_profiles')
        .onDelete('CASCADE')
      table
        .integer('sport_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sports')
        .onDelete('CASCADE')
      table.unique(['user_profile_id', 'sport_id'])

      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
