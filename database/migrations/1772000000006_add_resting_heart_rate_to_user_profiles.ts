import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('resting_heart_rate').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('resting_heart_rate')
    })
  }
}
