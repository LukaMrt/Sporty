import type { UserProfile } from '#domain/entities/user_profile'

export abstract class UserProfileRepository {
  abstract create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile>
}
