import User from '#models/user'
import { UserRole } from '#domain/value_objects/user_role'

export async function createUser(role: UserRole = UserRole.User) {
  return User.create({
    fullName: `Test ${role}`,
    email: `${role}@example.com`,
    password: 'password123',
    role,
  })
}
