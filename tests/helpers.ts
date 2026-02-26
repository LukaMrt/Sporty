import User from '#models/user'
import {
  SEEDED_USER_EMAIL,
  SEEDED_USER_2_EMAIL,
  SEEDED_ADMIN_EMAIL,
  SEEDED_NON_ONBOARDED_USER_EMAIL,
} from '#database/seeders/user_seeder'

export {
  SEEDED_USER_EMAIL,
  SEEDED_USER_2_EMAIL,
  SEEDED_ADMIN_EMAIL,
  SEEDED_NON_ONBOARDED_USER_EMAIL,
  SEEDED_PASSWORD,
} from '#database/seeders/user_seeder'

export async function getUser() {
  return User.findByOrFail('email', SEEDED_USER_EMAIL)
}

export async function getAdmin() {
  return User.findByOrFail('email', SEEDED_ADMIN_EMAIL)
}

export async function getUser2() {
  return User.findByOrFail('email', SEEDED_USER_2_EMAIL)
}

export async function getNonOnboardedUser() {
  return User.findByOrFail('email', SEEDED_NON_ONBOARDED_USER_EMAIL)
}
