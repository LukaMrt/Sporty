import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'

@inject()
export default class GetProfile {
  constructor(private userProfileRepository: UserProfileRepository) {}

  async execute(userId: number): Promise<UserProfile | null> {
    return this.userProfileRepository.findByUserId(userId)
  }
}
