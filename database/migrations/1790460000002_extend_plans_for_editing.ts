import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Plans éditables et multisports (plans rédigés avec Claude ou modifiés à la main) :
 * - plan : origine (généré / importé), nom, notes ;
 * - semaine : notes ;
 * - séance : sport, titre, description longue, cibles par sport (allure /100 m,
 *   puissance, RPE), exercices de renfo, ordre dans la journée (plusieurs séances
 *   possibles le même jour).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('training_plans', (table) => {
      table.string('source').notNullable().defaultTo('generated')
      table.string('name', 200).nullable()
      table.text('notes').nullable()
    })
    this.schema.alterTable('planned_weeks', (table) => {
      table.text('notes').nullable()
    })
    this.schema.alterTable('planned_sessions', (table) => {
      table.string('sport_slug').notNullable().defaultTo('running')
      table.string('title', 200).nullable()
      table.string('target_pace_per_100m').nullable()
      table.integer('target_power_watts').nullable()
      table.integer('target_rpe').nullable()
      table.jsonb('exercises').nullable()
      table.integer('order_in_day').notNullable().defaultTo(0)
      // Consignes détaillées (l'ancienne colonne `description` avait été retirée)
      table.text('description').notNullable().defaultTo('')
    })
  }

  async down() {
    this.schema.alterTable('planned_sessions', (table) => {
      table.dropColumns(
        'description',
        'sport_slug',
        'title',
        'target_pace_per_100m',
        'target_power_watts',
        'target_rpe',
        'exercises',
        'order_in_day'
      )
    })
    this.schema.alterTable('planned_weeks', (table) => {
      table.dropColumn('notes')
    })
    this.schema.alterTable('training_plans', (table) => {
      table.dropColumns('source', 'name', 'notes')
    })
  }
}
