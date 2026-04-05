import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import type { PlannedSession } from '#domain/entities/planned_session'

@inject()
export default class UpdateFitnessProfileListener {
  constructor(
    private sessionRepository: SessionRepository,
    private planRepository: TrainingPlanRepository,
    private loadCalculator: TrainingLoadCalculator
  ) {}

  async handle({ sessionId, userId }: { sessionId: number; userId: number }): Promise<void> {
    // Détecter si cette séance est la dernière session planifiée de sa semaine
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) return

    const allPlannedSessions = await this.planRepository.findSessionsByPlanId(plan.id)

    // Chercher la session planifiée liée à la session réalisée
    const linkedPlanned = allPlannedSessions.find((ps) => ps.completedSessionId === sessionId)
    if (!linkedPlanned) return

    // Vérifier si toutes les sessions non-rest de cette semaine sont terminées
    const weekSessions = allPlannedSessions.filter(
      (ps) =>
        ps.weekNumber === linkedPlanned.weekNumber &&
        ps.sessionType !== SessionType.Rest &&
        ps.sessionType !== SessionType.Recovery
    )

    if (weekSessions.length === 0) return

    const allDone = weekSessions.every((ps) => ps.status !== PlannedSessionStatus.Pending)

    if (!allDone) return

    // 3. Calculer le bilan de la semaine et émettre week:completed
    const weekSummary = await this.#computeWeekSummary(
      userId,
      plan.id,
      linkedPlanned.weekNumber,
      weekSessions
    )

    await emitter.emit('week:completed', {
      userId,
      planId: plan.id,
      weekSummary,
    })
  }

  async #computeWeekSummary(
    _userId: string | number,
    _planId: number,
    weekNumber: number,
    weekSessions: PlannedSession[]
  ) {
    const plannedLoadTss = weekSessions.reduce((sum, ps) => sum + (ps.targetLoadTss ?? 0), 0)

    // Charger les séances réelles liées à cette semaine
    const completedIds = weekSessions
      .map((ps) => ps.completedSessionId)
      .filter((id): id is number => id !== null)

    let actualLoadTss = 0
    const qualitySessions: {
      sessionType: string
      actualTss: number
      plannedTss: number
    }[] = []

    const QUALITY_TYPES: string[] = [
      SessionType.Tempo,
      SessionType.Interval,
      SessionType.Repetition,
    ]
    const isQuality = (type: string) => QUALITY_TYPES.includes(type)

    for (const ps of weekSessions) {
      const plannedTss = ps.targetLoadTss ?? 0

      if (ps.completedSessionId && completedIds.includes(ps.completedSessionId)) {
        const realSession = await this.sessionRepository.findById(ps.completedSessionId)
        if (realSession) {
          const load = this.loadCalculator.calculate({
            durationHours: realSession.durationMinutes / 60,
            perceivedEffort: realSession.perceivedEffort ?? undefined,
            avgPaceMPerMin: realSession.distanceKm
              ? (realSession.distanceKm * 1000) / realSession.durationMinutes
              : undefined,
          })
          actualLoadTss += load.value

          if (isQuality(ps.sessionType)) {
            qualitySessions.push({
              sessionType: ps.sessionType,
              actualTss: load.value,
              plannedTss,
            })
          }
        }
      } else if (ps.status === PlannedSessionStatus.Skipped) {
        // Séance sautée : contribue 0 TSS réel
        if (isQuality(ps.sessionType)) {
          qualitySessions.push({
            sessionType: ps.sessionType,
            actualTss: 0,
            plannedTss,
          })
        }
      }
    }

    return {
      weekNumber,
      plannedLoadTss,
      actualLoadTss,
      qualitySessions,
    }
  }
}
