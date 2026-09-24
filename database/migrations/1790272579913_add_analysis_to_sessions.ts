import { BaseSchema } from '@adonisjs/lucid/schema'

/** Indicateurs d'analyse par séance (meilleurs efforts, efficacité, zones…), quelques centaines d'octets */
export default class extends BaseSchema {
  protected tableName = 'sessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('analysis').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('analysis')
    })
  }
}
