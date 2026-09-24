import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Invariants métier jusqu'ici vérifiés uniquement côté application (donc sujets
 * aux courses entre requêtes concurrentes) :
 * - un seul plan actif ou brouillon par utilisateur ;
 * - un seul objectif actif par utilisateur ;
 * - pas deux fois la même séance importée d'un même provider.
 *
 * Les doublons éventuels sont d'abord résolus (on garde le plus récent),
 * sinon la création des index échouerait.
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE training_plans p SET status = 'abandoned', updated_at = NOW()
        WHERE p.status IN ('active', 'draft')
          AND EXISTS (
            SELECT 1 FROM training_plans o
            WHERE o.user_id = p.user_id AND o.status IN ('active', 'draft') AND o.id > p.id
          )
      `)
      await db.rawQuery(`
        UPDATE training_goals g SET status = 'abandoned', updated_at = NOW()
        WHERE g.status = 'active'
          AND EXISTS (
            SELECT 1 FROM training_goals o
            WHERE o.user_id = g.user_id AND o.status = 'active' AND o.id > g.id
          )
      `)
      await db.rawQuery(`
        UPDATE sessions s SET deleted_at = NOW()
        WHERE s.external_id IS NOT NULL AND s.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM sessions o
            WHERE o.user_id = s.user_id AND o.imported_from = s.imported_from
              AND o.external_id = s.external_id AND o.deleted_at IS NULL AND o.id > s.id
          )
      `)
    })

    this.schema.raw(`
      CREATE UNIQUE INDEX uniq_training_plans_one_open_per_user
      ON training_plans (user_id) WHERE status IN ('active', 'draft')
    `)
    this.schema.raw(`
      CREATE UNIQUE INDEX uniq_training_goals_one_active_per_user
      ON training_goals (user_id) WHERE status = 'active'
    `)
    this.schema.raw(`
      CREATE UNIQUE INDEX uniq_sessions_external
      ON sessions (user_id, imported_from, external_id)
      WHERE external_id IS NOT NULL AND deleted_at IS NULL
    `)
    // Requête dominante : séances non supprimées d'un utilisateur, triées par date
    this.schema.raw(`
      CREATE INDEX idx_sessions_user_date_alive
      ON sessions (user_id, date DESC) WHERE deleted_at IS NULL
    `)
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS idx_sessions_user_date_alive')
    this.schema.raw('DROP INDEX IF EXISTS uniq_sessions_external')
    this.schema.raw('DROP INDEX IF EXISTS uniq_training_goals_one_active_per_user')
    this.schema.raw('DROP INDEX IF EXISTS uniq_training_plans_one_open_per_user')
  }
}
