import type { UserPreferences } from '#domain/entities/user_preferences'

export enum UserLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
}

export interface UserProfile {
  id: number
  userId: number
  level: UserLevel | null
  objective: string | null
  preferences: UserPreferences
}
