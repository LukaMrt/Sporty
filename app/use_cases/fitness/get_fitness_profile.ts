import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import { Logger } from '#domain/interfaces/logger'
import type { FitnessDay, FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { TrainingLoad, TrainingLoadMethod } from '#domain/value_objects/training_load'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import { buildSessionLoadInput } from '#domain/services/session_load'
import { loadContribution } from '#domain/services/sport_load_contribution'

export type FitnessProfileResult = {
  asOf: string
  profile: FitnessProfile | null
  /** Série quotidienne, uniquement si demandée */
  series: FitnessDay[]
  /** Nombre de séances par méthode de calcul (transparence de l'estimation) */
  methods: Record<TrainingLoadMethod, number>
}

export type GetFitnessProfileOptions = {
  /** Date de calcul (défaut : aujourd'hui dans le fuseau de l'athlète) */
  asOf?: string
  /** Profondeur d'historique en jours (défaut : 365) */
  historyDays?: number
  withSeries?: boolean
}

/**
 * Point d'entrée unique du calcul de forme (CTL/ATL/TSB/ACWR).
 *
 * Lit la charge stockée par séance (`sessions.training_load`) ; les séances pas
 * encore calculées (historique antérieur) le sont à la volée, sans écriture :
 * la persistance est l'affaire de `RecomputeSessionMetrics`.
 */
@inject()
export default class GetFitnessProfile {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private loadCalculator: TrainingLoadCalculator,
    private fitnessCalculator: FitnessProfileCalculator,
    private logger: Logger
  ) {}

  async execute(
    userId: number,
    options: GetFitnessProfileOptions = {}
  ): Promise<FitnessProfileResult> {
    const profile = await this.userProfileRepository.findByUserId(userId)
    const asOf = options.asOf ?? todayInTimezone(profile?.timezone)
    const since = addDaysIso(asOf, -(options.historyDays ?? 365))
    const methods: Record<TrainingLoadMethod, number> = {
      trimp_exp: 0,
      rtss: 0,
      stss: 0,
      rpe: 0,
    }

    const entries = await this.sessionRepository.findLoadEntries(userId, since, asOf)
    if (entries.length === 0) return { asOf, profile: null, series: [], methods }

    const missing = entries.filter((e) => e.trainingLoad === null).map((e) => e.id)
    const computed = new Map<number, TrainingLoad>()
    for (const session of await this.sessionRepository.findByIds(missing)) {
      try {
        computed.set(
          session.id,
          this.loadCalculator.calculate(buildSessionLoadInput(session, profile))
        )
      } catch (error) {
        // Une séance aux données aberrantes ne doit pas faire disparaître tout le bloc
        this.logger.warn({ err: error, sessionId: session.id }, 'Training load computation failed')
      }
    }

    const loadHistory = entries.map((entry) => {
      const load: TrainingLoad =
        entry.trainingLoad !== null
          ? { value: entry.trainingLoad, method: entry.loadMethod ?? 'rpe' }
          : (computed.get(entry.id) ?? { value: 0, method: 'rpe' })
      methods[load.method]++
      const contribution = loadContribution(entry.sportSlug)
      return { date: entry.date, load: { ...load, value: load.value * contribution } }
    })

    return {
      asOf,
      profile: this.fitnessCalculator.calculate(loadHistory, asOf),
      series: options.withSeries ? this.fitnessCalculator.series(loadHistory, asOf) : [],
      methods,
    }
  }
}
