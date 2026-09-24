import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Une séance dont l'import échoue était re-tentée à chaque synchro, indéfiniment
 * et sans trace. On conserve désormais la raison et le nombre d'échecs.
 */
export default class extends BaseSchema {
  protected tableName = 'import_sessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('failure_reason', 500).nullable()
      table.integer('failed_attempts').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('failed_attempts')
      table.dropColumn('failure_reason')
    })
  }
}
