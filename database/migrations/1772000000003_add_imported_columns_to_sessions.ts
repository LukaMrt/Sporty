import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('imported_from').nullable()
      table.string('external_id').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('imported_from')
      table.dropColumn('external_id')
    })
  }
}
