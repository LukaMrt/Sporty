import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import UserProfile from '#models/user_profile'
import { UserLevel } from '#domain/entities/user_profile'

export const SEEDED_ADMIN_EMAIL = 'admin@example.com'
export const SEEDED_USER_EMAIL = 'user@example.com'
export const SEEDED_USER_2_EMAIL = 'user2@example.com'
export const SEEDED_NON_ONBOARDED_USER_EMAIL = 'non-onboarded@example.com'
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
        onboardingCompleted: true,
      }
    )

    await User.updateOrCreate(
      { email: SEEDED_USER_EMAIL },
      {
        fullName: 'Test User',
        email: SEEDED_USER_EMAIL,
        password: SEEDED_PASSWORD,
        role: 'user',
        onboardingCompleted: true,
      }
    )

    await User.updateOrCreate(
      { email: SEEDED_USER_2_EMAIL },
      {
        fullName: 'Test User 2',
        email: SEEDED_USER_2_EMAIL,
        password: SEEDED_PASSWORD,
        role: 'user',
        onboardingCompleted: true,
      }
    )

    const admin = await User.findByOrFail('email', SEEDED_ADMIN_EMAIL)
    await UserProfile.updateOrCreate(
      { userId: admin.id },
      {
        level: UserLevel.Intermediate,
        objective: 'prepare_competition',
        preferences: {
          speedUnit: 'min_km',
          distanceUnit: 'km',
          weightUnit: 'kg',
          weekStartsOn: 'monday',
          dateFormat: 'DD/MM/YYYY',
          locale: 'fr',
        },
        maxHeartRate: 185,
        vma: 16,
      }
    )

    await User.updateOrCreate(
      { email: SEEDED_NON_ONBOARDED_USER_EMAIL },
      {
        fullName: 'Non Onboarded User',
        email: SEEDED_NON_ONBOARDED_USER_EMAIL,
        password: SEEDED_PASSWORD,
        role: 'user',
        onboardingCompleted: false,
      }
    )
  }
}
