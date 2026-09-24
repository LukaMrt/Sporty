import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from '#domain/entities/user_preferences'

@inject()
export default class GetUserPreferences {
  constructor(private userProfileRepository: UserProfileRepository) {}

  async execute(userId: number): Promise<UserPreferences> {
    const profile = await this.userProfileRepository.findByUserId(userId)
    return profile?.preferences ?? DEFAULT_USER_PREFERENCES
  }
}
