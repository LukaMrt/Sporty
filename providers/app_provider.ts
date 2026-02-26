import type { ApplicationService } from '@adonisjs/core/types'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { AuthService } from '#domain/interfaces/auth_service'
import { SessionRepository } from '#domain/interfaces/session_repository'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(UserRepository, async () => {
      const { default: LucidUserRepository } = await import('#repositories/lucid_user_repository')
      return new LucidUserRepository()
    })

    this.app.container.bind(UserProfileRepository, async () => {
      const { default: LucidUserProfileRepository } =
        await import('#repositories/lucid_user_profile_repository')
      return new LucidUserProfileRepository()
    })

    this.app.container.bind(SportRepository, async () => {
      const { default: LucidSportRepository } = await import('#repositories/lucid_sport_repository')
      return new LucidSportRepository()
    })

    this.app.container.bind(AuthService, async (resolver) => {
      const { AdonisAuthService } = await import('#services/adonis_auth_service')
      return resolver.make(AdonisAuthService)
    })

    this.app.container.bind(SessionRepository, async () => {
      const { default: LucidSessionRepository } =
        await import('#repositories/lucid_session_repository')
      return new LucidSessionRepository()
    })
  }
}
