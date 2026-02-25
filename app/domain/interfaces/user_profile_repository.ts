import type { UserProfile } from '#domain/entities/user_profile'

export abstract class UserProfileRepository {
  abstract create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile>
  abstract findByUserId(userId: number): Promise<UserProfile | null>
  abstract update(
    userId: number,
    data: Partial<Omit<UserProfile, 'id' | 'userId'>>
  ): Promise<UserProfile>
}
