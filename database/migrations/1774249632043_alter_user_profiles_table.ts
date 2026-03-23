import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('sex').nullable()
      table.string('training_state').notNullable().defaultTo('idle')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sex')
      table.dropColumn('training_state')
    })
  }
}
