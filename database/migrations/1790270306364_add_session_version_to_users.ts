import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Incrémenté à chaque changement de mot de passe : les sessions ouvertes avec
 * une version antérieure sont refusées (le store de session cookie ne permet
 * pas de les supprimer côté serveur).
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('session_version').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('session_version')
    })
  }
}
