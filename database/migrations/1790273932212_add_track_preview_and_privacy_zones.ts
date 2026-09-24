import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * - sessions.track_preview : trace allégée (≤ 200 points) pour la carte de
 *   toutes les traces, lue sans charger sport_metrics
 * - user_profiles.privacy_zones : zones masquées sur les cartes (domicile…)
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('sessions', (table) => {
      table.jsonb('track_preview').nullable()
    })
    this.schema.alterTable('user_profiles', (table) => {
      table.jsonb('privacy_zones').nullable()
    })
  }

  async down() {
    this.schema.alterTable('user_profiles', (table) => {
      table.dropColumn('privacy_zones')
    })
    this.schema.alterTable('sessions', (table) => {
      table.dropColumn('track_preview')
    })
  }
}
