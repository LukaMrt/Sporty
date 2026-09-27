import type { ApplicationService } from '@adonisjs/core/types'
import { ConnectorScheduler } from '#domain/interfaces/connector_scheduler'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { SportRepository } from '#domain/interfaces/sport_repository'
import { AuthService } from '#domain/interfaces/auth_service'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { ConnectorRepository } from '#domain/interfaces/connector_repository'
import { ImportSessionRepository } from '#domain/interfaces/import_session_repository'
import { ConnectorRegistry } from '#domain/interfaces/connector_registry'
import { ApiKeyConnectorVerifier } from '#domain/interfaces/api_key_connector_verifier'
import { GpxParser } from '#domain/interfaces/gpx_parser'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { Logger } from '#domain/interfaces/logger'
import { OAuthClient } from '#domain/interfaces/oauth_client'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { WebhookVerifier } from '#domain/interfaces/webhook_verifier'

/** En-tête d'authentification Open Wearables par défaut (source unique) */
const DEFAULT_OW_API_KEY_HEADER = 'X-Open-Wearables-API-Key'

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

    this.app.container.bind(ImportSessionRepository, async () => {
      const { default: LucidImportSessionRepository } =
        await import('#repositories/lucid_import_session_repository')
      return new LucidImportSessionRepository()
    })

    // Pas de binding global de ConnectorFactory ni de RateLimitManager : le registre
    // est le seul point de resolution. Un binding global resoudrait silencieusement
    // vers Strava pour tout nouveau consommateur.
    this.app.container.singleton(ConnectorRegistry, async (resolver) => {
      const { InMemoryConnectorRegistry } = await import('#connectors/in_memory_connector_registry')
      const { StravaConnectorFactory } = await import('#connectors/strava/strava_connector_factory')
      const { StravaRateLimitManager } = await import('#connectors/rate_limit_manager')
      const { ConnectorProvider } = await import('#domain/value_objects/connector_provider')
      const { default: env } = await import('#start/env')
      const connectorRepo = await resolver.make(ConnectorRepository)
      const registry = new InMemoryConnectorRegistry()

      // Une instance de rate limiter par provider : les compteurs ne doivent
      // jamais etre partages entre deux APIs distinctes.
      const stravaRateLimiter = new StravaRateLimitManager()
      const stravaFactory = new StravaConnectorFactory(
        connectorRepo,
        stravaRateLimiter,
        env.get('STRAVA_CLIENT_ID') ?? '',
        env.get('STRAVA_CLIENT_SECRET') ?? ''
      )
      registry.register(ConnectorProvider.Strava, {
        factory: stravaFactory,
        rateLimiter: stravaRateLimiter,
      })

      // open-wearables n'est enregistre que s'il est configure : sinon la page
      // du provider repondrait 500 au lieu de simplement ne pas exister.
      const owBaseUrl = env.get('OPEN_WEARABLES_BASE_URL')
      if (owBaseUrl) {
        const { OpenWearablesConnectorFactory } =
          await import('#connectors/open_wearables/open_wearables_connector_factory')
        const { ThrottlingRateLimitManager } = await import('#connectors/rate_limit_manager')
        const owRateLimiter = new ThrottlingRateLimitManager({
          maxRequestsPerMinute: env.get('OPEN_WEARABLES_MAX_RPM') ?? 120,
        })
        registry.register(ConnectorProvider.OpenWearables, {
          factory: new OpenWearablesConnectorFactory(
            connectorRepo,
            owRateLimiter,
            owBaseUrl,
            env.get('OPEN_WEARABLES_API_KEY_HEADER') ?? DEFAULT_OW_API_KEY_HEADER
          ),
          rateLimiter: owRateLimiter,
        })
      }

      return registry
    })

    this.app.container.bind(ApiKeyConnectorVerifier, async () => {
      const { OpenWearablesApiKeyVerifier } =
        await import('#connectors/open_wearables/open_wearables_api_key_verifier')
      const { default: env } = await import('#start/env')
      return new OpenWearablesApiKeyVerifier(
        env.get('OPEN_WEARABLES_BASE_URL') ?? '',
        env.get('OPEN_WEARABLES_API_KEY_HEADER') ?? DEFAULT_OW_API_KEY_HEADER
      )
    })

    this.app.container.bind(GpxParser, async () => {
      const { GpxParserService } = await import('#services/gpx_parser_service')
      return new GpxParserService()
    })

    this.app.container.singleton(GpxFileStorage, async () => {
      const { LocalGpxFileStorage } = await import('#services/local_gpx_file_storage')
      const { default: env } = await import('#start/env')
      return new LocalGpxFileStorage(env.get('STORAGE_PATH') ?? this.app.makePath('storage'))
    })

    // Un seul provider OAuth aujourd'hui (Strava) : le port est lié directement.
    this.app.container.bind(OAuthClient, async () => {
      const { StravaOAuthClient } = await import('#connectors/strava/strava_oauth_client')
      const { default: env } = await import('#start/env')
      const appUrl = env.get('APP_URL') ?? `http://${env.get('HOST')}:${env.get('PORT')}`
      return new StravaOAuthClient(
        env.get('STRAVA_CLIENT_ID'),
        env.get('STRAVA_CLIENT_SECRET'),
        appUrl
      )
    })

    this.app.container.bind(DailyMetricsRepository, async () => {
      const { default: LucidDailyMetricsRepository } =
        await import('#repositories/lucid_daily_metrics_repository')
      return new LucidDailyMetricsRepository()
    })

    this.app.container.bind(WebhookVerifier, async () => {
      const { SvixWebhookVerifier } = await import('#services/svix_webhook_verifier')
      const { default: env } = await import('#start/env')
      return new SvixWebhookVerifier(env.get('OPEN_WEARABLES_WEBHOOK_SECRET'))
    })

    this.app.container.singleton(UnitOfWork, async () => {
      const { LucidUnitOfWork } = await import('#services/lucid_unit_of_work')
      return new LucidUnitOfWork()
    })

    this.app.container.singleton(Logger, async () => {
      const { AdonisLogger } = await import('#services/adonis_logger')
      return new AdonisLogger()
    })

    this.app.container.bind(TrainingLoadCalculator, async () => {
      const { TrainingLoadCalculatorImpl } =
        await import('#services/training/training_load_calculator_impl')
      return new TrainingLoadCalculatorImpl()
    })

    this.app.container.bind(FitnessProfileCalculator, async () => {
      const { BanisterFitnessCalculator } =
        await import('#services/training/banister_fitness_calculator')
      return new BanisterFitnessCalculator()
    })

    this.app.container.bind(TrainingGoalRepository, async () => {
      const { default: LucidTrainingGoalRepository } =
        await import('#repositories/lucid_training_goal_repository')
      return new LucidTrainingGoalRepository()
    })

    this.app.container.bind(TrainingPlanRepository, async () => {
      const { default: LucidTrainingPlanRepository } =
        await import('#repositories/lucid_training_plan_repository')
      return new LucidTrainingPlanRepository()
    })

    this.app.container.bind(TrainingPlanEngine, async () => {
      const { default: DanielsPlanEngine } = await import('#services/training/daniels_plan_engine')
      return new DanielsPlanEngine()
    })

    this.app.container.bind(EventEmitter, async () => {
      const { AdonisEventEmitter } = await import('#services/adonis_event_emitter')
      return new AdonisEventEmitter()
    })

    this.app.container.singleton(ConnectorScheduler, async (resolver) => {
      const { SyncScheduler } = await import('#services/sync_scheduler')
      const syncConnectorModule = await import('#use_cases/connectors/sync_connector')
      const SyncConnector = syncConnectorModule.default
      const syncFn = async (connectorId: number) => {
        const useCase = await resolver.make(SyncConnector)
        return useCase.execute({ connectorId })
      }
      const loadConnectorsFn = async () => {
        const repo = await resolver.make(ConnectorRepository)
        return repo.findAllAutoImportEnabled()
      }
      const logger = await resolver.make(Logger)
      return new SyncScheduler(syncFn, loadConnectorsFn, logger)
    })
  }

  /**
   * Le planificateur ne tourne que pour le serveur web : jamais en test (appels
   * réseau réels, non-déterminisme) ni dans les commandes ace.
   * `SCHEDULER_ENABLED=false` permet aussi de le couper explicitement.
   */
  async #schedulerEnabled(): Promise<boolean> {
    if (this.app.getEnvironment() !== 'web' || this.app.inTest) return false
    const { default: env } = await import('#start/env')
    return env.get('SCHEDULER_ENABLED', true)
  }

  async ready() {
    if (!(await this.#schedulerEnabled())) return

    const scheduler = await this.app.container.make(ConnectorScheduler)
    await scheduler.start()

    // Uploads GPX abandonnés (formulaire jamais soumis)
    const storage = await this.app.container.make(GpxFileStorage)
    const logger = await this.app.container.make(Logger)
    const purge = async () => {
      try {
        const removed = await storage.purgeTempFiles(24 * 60 * 60 * 1000)
        if (removed > 0) logger.info({ removed }, 'Purged stale GPX temp files')
      } catch (error) {
        logger.warn({ err: error }, 'GPX temp purge failed')
      }
    }
    await purge()

    // Clôture des semaines écoulées et fin des plans, même sans visite du planning
    const { default: AdvancePlanLifecycle } =
      await import('#use_cases/planning/advance_plan_lifecycle')
    const advancePlans = async () => {
      try {
        const useCase = await this.app.container.make(AdvancePlanLifecycle)
        await useCase.executeForAll()
      } catch (error) {
        logger.error({ err: error }, 'Plan lifecycle job failed')
      }
    }

    // Tâches de maintenance : toutes les 6 h (idempotentes)
    const everySixHours = 6 * 60 * 60 * 1000
    this.#timers.push(setInterval(() => void purge(), everySixHours))
    this.#timers.push(setInterval(() => void advancePlans(), everySixHours))
    for (const timer of this.#timers) timer.unref()
    void advancePlans()
  }

  #timers: NodeJS.Timeout[] = []

  async shutdown() {
    for (const timer of this.#timers) clearInterval(timer)
    if (!(await this.#schedulerEnabled())) return
    const scheduler = await this.app.container.make(ConnectorScheduler)
    scheduler.stop()
  }
}
