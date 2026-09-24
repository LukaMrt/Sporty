import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { WeekSummary } from '#domain/value_objects/week_summary'
import { PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import { buildSessionLoadInput } from '#domain/services/session_load'
import { estimatePlannedTss } from '#domain/services/planned_load'

export const QUALITY_SESSION_TYPES: string[] = [
  SessionType.Tempo,
  SessionType.Interval,
  SessionType.Repetition,
]

/** Bilan de charge prévue/réalisée d'une semaine de plan, pour la recalibration */
@inject()
export default class WeekSummaryBuilder {
  constructor(
    private sessionRepository: SessionRepository,
    private userProfileRepository: UserProfileRepository,
    private loadCalculator: TrainingLoadCalculator
  ) {}

  async build(
    userId: number,
    weekNumber: number,
    weekSessions: PlannedSession[]
  ): Promise<WeekSummary> {
    // Plans créés avant l'estimation de charge : targetLoadTss est null
    const plannedOf = (ps: PlannedSession) => ps.targetLoadTss ?? estimatePlannedTss(ps)
    const plannedLoadTss = weekSessions.reduce((sum, ps) => sum + plannedOf(ps), 0)
    const completedIds = weekSessions
      .map((ps) => ps.completedSessionId)
      .filter((id): id is number => id !== null)
    const linked = await this.sessionRepository.findByIds(completedIds)
    const realSessions = new Map(linked.map((s) => [s.id, s]))
    const profile = await this.userProfileRepository.findByUserId(userId)

    let actualLoadTss = 0
    const qualitySessions: WeekSummary['qualitySessions'] = []

    for (const ps of weekSessions) {
      const plannedTss = plannedOf(ps)
      const real = ps.completedSessionId ? realSessions.get(ps.completedSessionId) : undefined
      let actualTss = 0
      if (real) {
        // Charge stockée si disponible, sinon calculée avec les mêmes règles que le profil
        actualTss =
          real.trainingLoad ??
          this.loadCalculator.calculate(buildSessionLoadInput(real, profile)).value
        actualLoadTss += actualTss
      } else if (ps.status !== PlannedSessionStatus.Skipped) {
        continue
      }
      if (QUALITY_SESSION_TYPES.includes(ps.sessionType)) {
        qualitySessions.push({ sessionType: ps.sessionType, actualTss, plannedTss })
      }
    }

    return { weekNumber, plannedLoadTss, actualLoadTss, qualitySessions }
  }
}
