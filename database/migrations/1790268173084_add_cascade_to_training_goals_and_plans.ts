import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Les FK `user_id` de `training_goals` et `training_plans` avaient été créées sans
 * ON DELETE CASCADE : supprimer un utilisateur ayant utilisé le module Planning
 * levait une violation de clé étrangère.
 */
export default class extends BaseSchema {
  async up() {
    for (const table of ['training_goals', 'training_plans']) {
      this.schema.alterTable(table, (t) => {
        t.dropForeign(['user_id'])
        t.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      })
    }
  }

  async down() {
    for (const table of ['training_goals', 'training_plans']) {
      this.schema.alterTable(table, (t) => {
        t.dropForeign(['user_id'])
        t.foreign('user_id').references('id').inTable('users')
      })
    }
  }
}
