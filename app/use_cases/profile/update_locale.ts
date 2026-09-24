import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserPreferences } from '#domain/entities/user_preferences'

@inject()
export default class UpdateLocale {
  constructor(private userProfileRepository: UserProfileRepository) {}

  /** Persiste la langue dans le profil (si l'utilisateur en a un) */
  async execute(userId: number, locale: UserPreferences['locale']): Promise<void> {
    const profile = await this.userProfileRepository.findByUserId(userId)
    if (!profile) return
    await this.userProfileRepository.update(userId, {
      preferences: { ...profile.preferences, locale },
    })
  }
}
