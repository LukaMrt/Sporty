import { Connector } from '#domain/interfaces/connector'
import type {
  SessionFilters,
  MappingContext,
  MappedSessionSummary,
  MappedSessionData,
} from '#domain/interfaces/connector'
import { ConnectorStatus } from '#domain/value_objects/connector_status'
import type { RateLimitManager } from '#domain/interfaces/rate_limit_manager'
import type { RunMetrics } from '#domain/value_objects/run_metrics'
import { ConnectorAuthError } from '#domain/errors/connector_auth_error'
import logger from '@adonisjs/core/services/logger'
import { computeAllureFromDistance } from '#connectors/pace'
import {
  OpenWearablesHttpClient,
  type Fetcher,
} from '#connectors/open_wearables/open_wearables_http_client'
import { OpenWearablesSportMapper } from '#connectors/open_wearables/open_wearables_sport_mapper'
import { dedupeWorkouts, isSameWorkout } from '#connectors/open_wearables/workout_deduplicator'
import {
  toHeartRateCurve,
  toRunningDynamics,
  RUNNING_DYNAMICS_TYPES,
} from '#connectors/open_wearables/timeseries_converter'
import {
  encodeExternalId,
  decodeExternalId,
} from '#connectors/open_wearables/open_wearables_external_id'
import type { RawOwWorkout, RawOwTimeSeriesSample } from '#connectors/open_wearables/types'
import { MAX_PAGE_SIZE } from '#connectors/open_wearables/open_wearables_http_client'
import {
  toDailyWellness,
  WELLNESS_TIMESERIES_TYPES,
  type RawOwActivitySummary,
  type RawOwHealthScore,
  type RawOwSleep,
} from '#connectors/open_wearables/wellness_converter'
import type { DailyWellness } from '#domain/value_objects/daily_wellness'

/** Pas d'échantillonnage le plus fin supposé (montre à 1 Hz) */
const MIN_SAMPLE_PERIOD_SECONDS = 1
/** Pages de marge au-delà de l'estimation (pauses, doublons de sources) */
const TIMESERIES_PAGE_MARGIN = 5

export const IMPORTED_FROM = 'open-wearables'

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

export class OpenWearablesConnector extends Connector {
  readonly id: number
  readonly #sportMapper = new OpenWearablesSportMapper()
  readonly #client: OpenWearablesHttpClient
  /**
   * Workouts déjà téléchargés, par fenêtre de 3 jours. Une instance sert un lot
   * d'import : les séances d'une même journée ne re-téléchargent plus la liste.
   */
  readonly #workoutsByWindow = new Map<string, Promise<RawOwWorkout[]>>()

  constructor(
    connectorId: number,
    private externalUserId: string,
    apiKey: string,
    baseUrl: string,
    apiKeyHeader: string,
    rateLimitManager: RateLimitManager,
    options: { fetcher?: Fetcher } = {}
  ) {
    super()
    this.id = connectorId
    this.#client = new OpenWearablesHttpClient(
      baseUrl,
      apiKey,
      apiKeyHeader,
      rateLimitManager,
      options.fetcher
    )
  }

  async listSessions(filters: SessionFilters): Promise<MappedSessionSummary[]> {
    const after = filters.after ?? addDays(new Date(), -30)
    const before = filters.before ?? new Date()

    const workouts = await this.#fetchWorkouts(after, before)
    return dedupeWorkouts(workouts).map((w) => this.#toSummary(w))
  }

  async getSessionDetail(externalId: string, context?: MappingContext): Promise<MappedSessionData> {
    const decoded = decodeExternalId(externalId)
    if (!decoded) {
      throw new Error(`Invalid open-wearables externalId: ${externalId}`)
    }

    // Il n'existe pas de GET /workouts/{id} : on rejoue la journee de la seance
    // puis on la retrouve par (instant, type). Le filtre est a la journee et
    // end_date est exclusif.
    const day = new Date(decoded.startUtc)
    const windowKey = toDateParam(day)
    let pending = this.#workoutsByWindow.get(windowKey)
    if (!pending) {
      pending = this.#fetchWorkouts(addDays(day, -1), addDays(day, 1))
      // En cas d'échec, ne pas garder la promesse rejetée en cache
      pending.catch(() => this.#workoutsByWindow.delete(windowKey))
      this.#workoutsByWindow.set(windowKey, pending)
    }
    const workouts = await pending
    const target = dedupeWorkouts(workouts).find((w) =>
      isSameWorkout(w, { start_time: decoded.startUtc.toISOString(), type: decoded.type })
    )

    if (!target) {
      throw new Error(`Workout not found for externalId: ${externalId}`)
    }

    return this.#toSessionData(target, context)
  }

  async getConnectionStatus(): Promise<ConnectorStatus> {
    try {
      await this.#client.get<unknown>(`/users/${this.externalUserId}/connections`)
      return ConnectorStatus.Connected
    } catch (error) {
      // Seule une clé refusée (401/403) est un état d'erreur ; un serveur
      // indisponible ou un timeout ne doit pas afficher le connecteur comme cassé
      if (error instanceof ConnectorAuthError) return ConnectorStatus.Error
      logger.warn({ err: error, connectorId: this.id }, 'Open Wearables status check failed')
      return ConnectorStatus.Connected
    }
  }

  async disconnect(): Promise<void> {
    // La cle API appartient a l'utilisateur : rien a revoquer a distance.
  }

  supportsWellness(): boolean {
    return true
  }

  /**
   * Récupération et santé quotidiennes : FC repos, HRV, poids, SpO2… (séries
   * temporelles), sommeil (événements) et pas / minutes d'intensité (résumés).
   * Chaque source est facultative : une montre qui ne la fournit pas, ou une
   * version du serveur qui ne l'expose pas, ne bloque pas les autres.
   */
  async listDailyWellness(from: Date, to: Date): Promise<DailyWellness[]> {
    const base = `/users/${this.externalUserId}`
    const optional = async <T>(label: string, fetcher: () => Promise<T[]>): Promise<T[]> => {
      try {
        return await fetcher()
      } catch (error) {
        if (error instanceof ConnectorAuthError) throw error
        logger.warn(
          { err: error, connectorId: this.id, source: label },
          'Wellness source unavailable'
        )
        return []
      }
    }

    const [samples, sleeps, activities, scores] = await Promise.all([
      optional('timeseries', () =>
        this.#client.getAllPages<RawOwTimeSeriesSample>(`${base}/timeseries`, {
          start_time: from.toISOString(),
          end_time: to.toISOString(),
          types: WELLNESS_TIMESERIES_TYPES,
        })
      ),
      optional('sleep', () =>
        this.#client.getAllPages<RawOwSleep>(`${base}/events/sleep`, {
          start_date: toDateParam(from),
          end_date: toDateParam(addDays(to, 1)),
          include: ['stages'],
        })
      ),
      optional('activity', () =>
        this.#client.getAllPages<RawOwActivitySummary>(`${base}/summaries/activity`, {
          start_date: toDateParam(from),
          end_date: toDateParam(addDays(to, 1)),
        })
      ),
      optional('health-scores', () =>
        this.#client.getAllPages<RawOwHealthScore>(`${base}/health-scores`, {
          start_date: toDateParam(from),
          end_date: toDateParam(addDays(to, 1)),
        })
      ),
    ])

    return toDailyWellness({ samples, sleeps, activities, scores })
  }

  async #fetchWorkouts(after: Date, before: Date): Promise<RawOwWorkout[]> {
    return this.#client.getAllPages<RawOwWorkout>(`/users/${this.externalUserId}/events/workouts`, {
      start_date: toDateParam(after),
      // end_date est exclusif cote API : on ajoute un jour pour inclure `before`.
      end_date: toDateParam(addDays(before, 1)),
    })
  }

  #toSummary(workout: RawOwWorkout): MappedSessionSummary {
    const sportSlug = this.#sportMapper.map(workout.type)
    return {
      externalId: encodeExternalId(workout.start_time, workout.type),
      name: workout.name ?? this.#defaultName(workout),
      sportSlug,
      // Date locale de la seance : `list_pre_import_sessions` filtre dessus.
      date: workout.start_time,
      durationMinutes: Math.round(workout.duration_seconds / 60),
      distanceKm: this.#toKm(workout.distance_meters),
      avgHeartRate: workout.avg_heart_rate_bpm,
    }
  }

  async #toSessionData(
    workout: RawOwWorkout,
    context?: MappingContext
  ): Promise<MappedSessionData> {
    const sportSlug = this.#sportMapper.map(workout.type)
    const durationMinutes = Math.round(workout.duration_seconds / 60)

    // Métriques communes à tous les sports ; les champs spécifiques à la course
    // (courbe FC…) sont optionnels dans RunMetrics.
    const metrics: RunMetrics & Record<string, unknown> = {
      allure: computeAllureFromDistance(
        workout.distance_meters,
        workout.duration_seconds,
        sportSlug
      ),
      calories: workout.calories_kcal,
      elevationGain: workout.elevation_gain_meters ?? undefined,
      maxHeartRate: workout.max_heart_rate_bpm ?? undefined,
      deviceName: workout.source?.device_name ?? null,
      subType: this.#sportMapper.subType(workout.type),
    }

    // Degradation gracieuse : sans FC la seance reste importable.
    try {
      const { curve, truncated, dynamics } = await this.#fetchHeartRateCurve(
        workout,
        sportSlug === 'running'
      )
      if (dynamics) metrics.runningDynamics = dynamics
      if (curve.length > 0) {
        metrics.heartRateCurve = curve
        metrics.minHeartRate = Math.min(...curve.map((p) => p.value))
        metrics.maxHeartRate = workout.max_heart_rate_bpm ?? Math.max(...curve.map((p) => p.value))
      }
      if (truncated) {
        metrics.heartRateCurveTruncated = true
        logger.warn(
          {
            connectorId: this.id,
            workoutId: workout.id,
            durationSeconds: workout.duration_seconds,
          },
          'Open Wearables heart rate curve truncated'
        )
      }
    } catch (error) {
      if (error instanceof ConnectorAuthError) throw error
      logger.warn(
        { err: error, connectorId: this.id, workoutId: workout.id },
        'Open Wearables timeseries unavailable, importing without curve'
      )
    }

    // Zones, dérive et TRIMP sont calculés à l'écriture avec les zones de l'athlète
    void context

    return {
      sportSlug,
      // Jour local de la seance : on decoupe la chaine brute plutot que de passer
      // par Date, qui decalerait au jour precedent toute seance avant 02h00.
      date: workout.start_time.slice(0, 10),
      durationMinutes,
      distanceKm: this.#toKm(workout.distance_meters),
      avgHeartRate: workout.avg_heart_rate_bpm,
      importedFrom: IMPORTED_FROM,
      externalId: encodeExternalId(workout.start_time, workout.type),
      sportMetrics: metrics,
    }
  }

  async #fetchHeartRateCurve(workout: RawOwWorkout, withDynamics: boolean) {
    // Plafond calculé selon la durée : une séance de 2 h à 1 Hz dépasse largement
    // les 50 pages par défaut, ce qui tronquait la courbe sans prévenir.
    const expectedSamples = Math.ceil(
      Math.max(workout.duration_seconds, 0) / MIN_SAMPLE_PERIOD_SECONDS
    )
    // Une seule requête (types=a,b,c) : FC + dynamique de course pour la course
    const types = withDynamics
      ? ['heart_rate', ...Object.keys(RUNNING_DYNAMICS_TYPES)]
      : ['heart_rate']
    const maxPages =
      Math.ceil((expectedSamples * types.length) / MAX_PAGE_SIZE) + TIMESERIES_PAGE_MARGIN
    const { data: samples, truncated } =
      await this.#client.getAllPagesWithMeta<RawOwTimeSeriesSample>(
        `/users/${this.externalUserId}/timeseries`,
        {
          start_time: new Date(workout.start_time).toISOString(),
          end_time: new Date(workout.end_time).toISOString(),
          types,
        },
        maxPages
      )
    return {
      curve: toHeartRateCurve(samples, workout.start_time, workout.duration_seconds),
      truncated,
      dynamics: withDynamics ? toRunningDynamics(samples, workout.start_time) : null,
    }
  }

  #toKm(distanceMeters: number | null): number | null {
    if (distanceMeters === null || distanceMeters <= 0) return null
    return distanceMeters / 1000
  }

  #defaultName(workout: RawOwWorkout): string {
    return `${this.#sportMapper.label(workout.type)} ${workout.start_time.slice(11, 16)}`
  }
}
