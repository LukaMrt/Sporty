import { BaseSchema } from '@adonisjs/lucid/schema'

const SPORTS = [
  { name: 'Vélo', slug: 'cycling' },
  { name: 'Renforcement', slug: 'strength' },
]

/**
 * Vélo et renforcement : le vélo était déjà mappé par les connecteurs (imports
 * rejetés en `unsupported_sport:cycling`), le renforcement devient planifiable.
 * Même approche que la marche : migration de données, le seeder ne suffit pas en prod.
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
            default_metrics: JSON.stringify({}),
            created_at: new Date(),
          }))
        )
        .onConflict('slug')
        .ignore()

      // Les imports rejetés faute de sport sont remis en file
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
