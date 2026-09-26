import { BaseSchema } from '@adonisjs/lucid/schema'

const PACE_METRICS = {
  pace_per_km: { type: 'duration', unit: 'min/km', label: 'Allure' },
}

const SPORTS = [
  { name: 'Marche', slug: 'walking' },
  { name: 'Randonnée', slug: 'hiking' },
]

/**
 * Marche et randonnée sont mappées par les connecteurs mais absentes de la table :
 * leurs imports échouaient en `unsupported_sport:*`. Même approche que la natation
 * (migration de données, le seeder ne suffit pas en production).
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db
        .insertQuery()
        .table('sports')
        .insert(
          SPORTS.map((sport) => ({
            ...sport,
            default_metrics: JSON.stringify(PACE_METRICS),
            created_at: new Date(),
          }))
        )
        .onConflict('slug')
        .ignore()

      // Les imports rejetés faute de sport ont épuisé leurs essais : on les
      // remet en file pour la prochaine synchro.
      await db
        .from('import_sessions')
        .whereIn(
          'failure_reason',
          SPORTS.map((s) => `unsupported_sport:${s.slug}`)
        )
        .update({ status: 'new', failed_attempts: 0, failure_reason: null })
    })
  }

  async down() {
    this.defer(async (db) => {
      // Une séance référence le sport : on ne le retire que s'il est inutilisé
      await db
        .from('sports')
        .whereIn(
          'slug',
          SPORTS.map((s) => s.slug)
        )
        .whereNotExists((q) => q.from('sessions').whereColumn('sessions.sport_id', 'sports.id'))
        .delete()
    })
  }
}
