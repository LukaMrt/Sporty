import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery('ALTER TABLE import_activities RENAME TO import_sessions')
  }

  async down() {
    await this.db.rawQuery('ALTER TABLE import_sessions RENAME TO import_activities')
  }
}
