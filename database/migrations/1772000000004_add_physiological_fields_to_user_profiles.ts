import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('max_heart_rate').nullable()
      table.float('vma').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('max_heart_rate')
      table.dropColumn('vma')
    })
  }
}
