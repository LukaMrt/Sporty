import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'connectors'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('external_user_id').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('external_user_id')
    })
  }
}
