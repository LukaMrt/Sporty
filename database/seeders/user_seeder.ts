import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export const SEEDED_ADMIN_EMAIL = 'admin@example.com'
export const SEEDED_USER_EMAIL = 'user@example.com'
export const SEEDED_PASSWORD = 'password123'

export default class UserSeeder extends BaseSeeder {
  async run() {
    await User.updateOrCreate(
      { email: SEEDED_ADMIN_EMAIL },
      {
        fullName: 'Test Admin',
        email: SEEDED_ADMIN_EMAIL,
        password: SEEDED_PASSWORD,
        role: 'admin',
      }
    )

    await User.updateOrCreate(
      { email: SEEDED_USER_EMAIL },
      {
        fullName: 'Test User',
        email: SEEDED_USER_EMAIL,
        password: SEEDED_PASSWORD,
        role: 'user',
      }
    )
  }
}
