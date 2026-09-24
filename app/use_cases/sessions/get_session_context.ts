import { inject } from '@adonisjs/core'
import { DailyMetricsRepository } from '#domain/interfaces/daily_metrics_repository'
import { addDaysIso } from '#domain/services/calendar'
import type { DailyWellness } from '#domain/value_objects/daily_wellness'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'

export type SessionContext = {
  /** Nuit précédant la séance (rattachée au jour de la séance) et récupération du jour */
  wellness: Pick<
    DailyWellness,
    'sleepMinutes' | 'sleepEfficiency' | 'hrvRmssd' | 'restingHeartRate'
  > | null
  /** État de forme la veille de la séance */
  fitnessBefore: { ctl: number; atl: number; tsb: number } | null
}

/** F5 · Contexte d'une séance : sommeil de la veille, HRV, fraîcheur avant la séance */
@inject()
export default class GetSessionContext {
  constructor(
    private dailyMetrics: DailyMetricsRepository,
    private getFitnessProfile: GetFitnessProfile
  ) {}

  async execute(userId: number, date: string): Promise<SessionContext> {
    const [days, fitness] = await Promise.all([
      this.dailyMetrics.findRange(userId, date, date),
      this.getFitnessProfile.execute(userId, { asOf: addDaysIso(date, -1) }),
    ])
    const day = days[0]
    const f = fitness.profile
    return {
      wellness: day
        ? {
            sleepMinutes: day.sleepMinutes,
            sleepEfficiency: day.sleepEfficiency,
            hrvRmssd: day.hrvRmssd,
            restingHeartRate: day.restingHeartRate,
          }
        : null,
      fitnessBefore: f
        ? {
            ctl: Math.round(f.chronicTrainingLoad),
            atl: Math.round(f.acuteTrainingLoad),
            tsb: Math.round(f.trainingStressBalance),
          }
        : null,
    }
  }
}
