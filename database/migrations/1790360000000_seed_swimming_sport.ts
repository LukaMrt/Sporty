import { BaseSchema } from '@adonisjs/lucid/schema'

const SWIMMING_METRICS = {
  pace_per_100m: { type: 'duration', unit: 'min/100m', label: 'Allure' },
}

/**
 * La natation est un sport de référence : sans cette ligne, les séances de nage
 * importées échouaient en `unsupported_sport:swimming`. Le seeder ne suffit pas
 * en production (`db:seed` tronque la base), d'où une migration de données.
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db
        .insertQuery()
        .table('sports')
        .insert({
          name: 'Natation',
          slug: 'swimming',
          default_metrics: JSON.stringify(SWIMMING_METRICS),
          created_at: new Date(),
        })
        .onConflict('slug')
        .ignore()

      // Les imports rejetés faute de sport ont épuisé leurs essais : on les
      // remet en file pour la prochaine synchro.
      await db
        .from('import_sessions')
        .where('failure_reason', 'unsupported_sport:swimming')
        .update({ status: 'new', failed_attempts: 0, failure_reason: null })
    })
  }

  async down() {
    this.defer(async (db) => {
      // Une séance de natation référence le sport : on ne le retire que s'il est inutilisé
      await db
        .from('sports')
        .where('slug', 'swimming')
        .whereNotExists((q) => q.from('sessions').whereColumn('sessions.sport_id', 'sports.id'))
        .delete()
    })
  }
}
