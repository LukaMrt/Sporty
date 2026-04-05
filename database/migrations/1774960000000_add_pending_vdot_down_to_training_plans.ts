import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'training_plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('pending_vdot_down').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pending_vdot_down')
    })
  }
}
