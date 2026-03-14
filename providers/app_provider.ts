import type { ApplicationService } from '@adonisjs/core/types'
import { ConnectorScheduler } from '#domain/interfaces/connector_scheduler'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { AuthService } from '#domain/interfaces/auth_service'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ImportActivityRepository } from '#domain/interfaces/import_activity_repository'
import { ConnectorFactory } from '#domain/interfaces/connector_factory'
import { RateLimitManager } from '#connectors/rate_limit_manager'
import { ActivityMapper } from '#domain/interfaces/activity_mapper'

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

    this.app.container.bind(ConnectorRepository, async () => {
      const { default: LucidConnectorRepository } =
        await import('#repositories/lucid_connector_repository')
      return new LucidConnectorRepository()
    })

    this.app.container.bind(ImportActivityRepository, async () => {
      const { default: LucidImportActivityRepository } =
        await import('#repositories/lucid_import_activity_repository')
      return new LucidImportActivityRepository()
    })

    this.app.container.bind(ConnectorFactory, async (resolver) => {
      const { StravaConnectorFactory } = await import('#connectors/strava/strava_connector_factory')
      const connectorRepo = await resolver.make(ConnectorRepository)
      const rateLimitMgr = await resolver.make(RateLimitManager)
      const { default: env } = await import('#start/env')
      const clientId = env.get('STRAVA_CLIENT_ID') ?? ''
      const clientSecret = env.get('STRAVA_CLIENT_SECRET') ?? ''
      return new StravaConnectorFactory(connectorRepo, rateLimitMgr, clientId, clientSecret)
    })

    this.app.container.singleton(RateLimitManager, async () => {
      const { StravaRateLimitManager } = await import('#connectors/rate_limit_manager')
      return new StravaRateLimitManager()
    })

    this.app.container.bind(ActivityMapper, async () => {
      const { StravaDetailedActivityMapper } =
        await import('#connectors/strava/strava_detailed_activity_mapper')
      return new StravaDetailedActivityMapper()
    })

    this.app.container.singleton(ConnectorScheduler, async (resolver) => {
      const { SyncScheduler } = await import('#services/sync_scheduler')
      const syncConnectorModule = await import('#use_cases/connectors/sync_connector')
      const SyncConnector = syncConnectorModule.default
      const syncFn = async (connectorId: number, userId: number) => {
        const useCase = await resolver.make(SyncConnector)
        return useCase.execute({ connectorId, userId })
      }
      const loadConnectorsFn = async () => {
        const repo = await resolver.make(ConnectorRepository)
        return repo.findAllAutoImportEnabled()
      }
      return new SyncScheduler(syncFn, loadConnectorsFn)
    })
  }

  async ready() {
    if (!['web', 'test'].includes(this.app.getEnvironment())) return

    const scheduler = await this.app.container.make(ConnectorScheduler)
    await scheduler.start()
  }

  async shutdown() {
    const scheduler = await this.app.container.make(ConnectorScheduler)
    scheduler.stop()
  }
}
