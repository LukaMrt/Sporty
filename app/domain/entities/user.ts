import type { UserRole } from '#domain/value_objects/user_role'

export interface User {
  id: number
  email: string
  fullName: string
  password: string
  role: UserRole
  onboardingCompleted: boolean
  createdAt: string
}
