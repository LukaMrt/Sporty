import { AuthService } from '#domain/interfaces/auth_service'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'
import type { UserPreferences } from '#domain/entities/user_preferences'
import { inject } from '@adonisjs/core'

export type LoginResult = {
  /** Langue préférée enregistrée dans le profil, à restaurer en session */
  locale: UserPreferences['locale'] | null
}

@inject()
export default class LoginUser {
  constructor(
    private authService: AuthService,
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(email: string, password: string): Promise<LoginResult> {
    const userId = await this.authService.attempt(email, password)
    const profile = await this.userProfileRepository.findByUserId(userId)
    return { locale: profile?.preferences?.locale ?? null }
  }

  async ensureUsersExist(): Promise<void> {
    const count = await this.userRepository.countAll()
    if (count === 0) {
      throw new NoRegisteredUserError()
    }
  }
}
