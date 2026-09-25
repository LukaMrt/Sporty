import { BaseSchema } from '@adonisjs/lucid/schema'

/** CSS (vitesse critique de nage, min/100 m) : référence du sTSS natation */
export default class extends BaseSchema {
  protected tableName = 'user_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('css_pace_per_100m').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('css_pace_per_100m')
    })
  }
}
