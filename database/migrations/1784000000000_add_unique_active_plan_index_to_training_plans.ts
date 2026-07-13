import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Garantit au niveau base qu'un utilisateur n'a jamais plus d'un plan
 * actif (ou draft) à la fois — filet de sécurité derrière les gardes
 * applicatives des use cases de génération.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(
      `CREATE UNIQUE INDEX training_plans_one_active_per_user
       ON training_plans (user_id)
       WHERE status IN ('active', 'draft')`
    )
  }

  async down() {
    this.schema.raw('DROP INDEX training_plans_one_active_per_user')
  }
}
