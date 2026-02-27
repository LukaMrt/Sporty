import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_profiles'

  async up() {
    await this.db.rawQuery(`
      UPDATE user_profiles
      SET preferences = preferences || '{"locale": "fr"}'::jsonb
      WHERE preferences->>'locale' IS NULL
    `)
  }

  async down() {
    await this.db.rawQuery(`
      UPDATE user_profiles
      SET preferences = preferences - 'locale'
    `)
  }
}
