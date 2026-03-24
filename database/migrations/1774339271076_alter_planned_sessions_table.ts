import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'planned_sessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('description')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('description').notNullable().defaultTo('')
    })
  }
}
