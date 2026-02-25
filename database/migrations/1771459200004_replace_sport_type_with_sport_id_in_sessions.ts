import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sessions'

  async up() {
    // 1. Ajout sport_id nullable
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('sport_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('sports')
        .onDelete('RESTRICT')
      table.index('sport_id', 'idx_sessions_sport_id')
    })

    // 2. Migration des données existantes via slug
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE sessions
        SET sport_id = (SELECT id FROM sports WHERE slug = sessions.sport_type LIMIT 1)
        WHERE sport_type IS NOT NULL
      `)
    })

    // 3. Rend sport_id NOT NULL, supprime sport_type et son index
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex('sport_type', 'idx_sessions_sport_type')
      table.dropColumn('sport_type')
      table.integer('sport_id').unsigned().notNullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('sport_type').nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE sessions
        SET sport_type = (SELECT slug FROM sports WHERE id = sessions.sport_id LIMIT 1)
      `)
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex('sport_id', 'idx_sessions_sport_id')
      table.dropForeign('sport_id')
      table.dropColumn('sport_id')
      table.string('sport_type').notNullable().alter()
      table.index('sport_type', 'idx_sessions_sport_type')
    })
  }
}
