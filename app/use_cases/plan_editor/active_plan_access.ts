import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { NoActivePlanError } from '#domain/errors/no_active_plan_error'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import { PlannedWeekNotFoundError } from '#domain/errors/planned_week_not_found_error'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import { SessionType } from '#domain/value_objects/planning_types'
import { addDaysIso } from '#domain/services/calendar'

/**
 * Accès au plan actif pour l'édition : vérifie la propriété et garde les
 * agrégats cohérents (volume de chaque semaine, fin du plan, séances/semaine)
 * après chaque modification. Partagé par tous les use cases d'édition.
 */
@inject()
export default class ActivePlanAccess {
  constructor(private planRepository: TrainingPlanRepository) {}

  async plan(userId: number): Promise<TrainingPlan> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) throw new NoActivePlanError()
    return plan
  }

  async session(
    userId: number,
    sessionId: number
  ): Promise<{ plan: TrainingPlan; session: PlannedSession }> {
    const session = await this.planRepository.findSessionById(sessionId)
    if (!session) throw new PlannedSessionNotFoundError(sessionId)
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan || plan.id !== session.planId) throw new PlannedSessionForbiddenError()
    return { plan, session }
  }

  async week(plan: TrainingPlan, weekNumber: number): Promise<PlannedWeek> {
    const weeks = await this.planRepository.findWeeksByPlanId(plan.id)
    const week = weeks.find((w) => w.weekNumber === weekNumber)
    if (!week) throw new PlannedWeekNotFoundError(weekNumber)
    return week
  }

  /** Recalcule le volume de chaque semaine, la fin du plan et le nombre de séances par semaine */
  async refresh(plan: TrainingPlan): Promise<void> {
    const [weeks, sessions] = await Promise.all([
      this.planRepository.findWeeksByPlanId(plan.id),
      this.planRepository.findSessionsByPlanId(plan.id),
    ])
    const real = sessions.filter((s) => s.sessionType !== SessionType.Rest)
    for (const week of weeks) {
      const volume = real
        .filter((s) => s.weekNumber === week.weekNumber)
        .reduce((a, s) => a + s.targetDurationMinutes, 0)
      if (volume !== week.targetVolumeMinutes) {
        await this.planRepository.updateWeek(week.id, { targetVolumeMinutes: volume })
      }
    }
    await this.planRepository.update(plan.id, {
      endDate: addDaysIso(plan.startDate, weeks.length * 7),
      sessionsPerWeek: weeks.length > 0 ? Math.max(1, Math.round(real.length / weeks.length)) : 1,
    })
  }
}
