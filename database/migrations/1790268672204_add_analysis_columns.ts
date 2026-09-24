import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Colonnes nécessaires à une charge d'entraînement fiable et aux zones configurables :
 * - user_profiles.hr_zones_config : méthode de zones choisie (null = auto)
 * - user_profiles.vdot : VDOT confirmé, persisté (auparavant en session, perdu à la déconnexion)
 * - user_profiles.timezone : fuseau IANA pour calculer "aujourd'hui" côté athlète
 * - sessions.training_load / load_method : TSS calculé une fois par séance
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('user_profiles', (table) => {
      table.jsonb('hr_zones_config').nullable()
      table.float('vdot').nullable()
      table.string('timezone').nullable()
    })
    this.schema.alterTable('sessions', (table) => {
      table.float('training_load').nullable()
      table.string('load_method').nullable()
    })
  }

  async down() {
    this.schema.alterTable('sessions', (table) => {
      table.dropColumn('load_method')
      table.dropColumn('training_load')
    })
    this.schema.alterTable('user_profiles', (table) => {
      table.dropColumn('timezone')
      table.dropColumn('vdot')
      table.dropColumn('hr_zones_config')
    })
  }
}
