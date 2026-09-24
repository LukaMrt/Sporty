import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import AutoLinkCompletedSession from '#use_cases/planning/auto_link_completed_session'
import WeekSummaryBuilder from '#use_cases/planning/week_summary_builder'

/** Types exclus du bilan de semaine (pas d'objectif de charge) */
export const WEEK_EXCLUDED_TYPES: string[] = [SessionType.Rest, SessionType.Recovery]

/**
 * Réaction à une séance réalisée : liaison automatique à la séance planifiée,
 * puis, si toutes les séances de sa semaine sont traitées, émission de
 * `week:completed` (qui déclenche la recalibration).
 */
@inject()
export default class DetectWeekCompletion {
  constructor(
    private planRepository: TrainingPlanRepository,
    private autoLink: AutoLinkCompletedSession,
    private weekSummaryBuilder: WeekSummaryBuilder,
    private eventEmitter: EventEmitter
  ) {}

  async execute(userId: number, sessionId: number): Promise<void> {
    await this.autoLink.execute(userId, sessionId)

    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) return

    const allPlanned = await this.planRepository.findSessionsByPlanId(plan.id)
    const linked = allPlanned.find((ps) => ps.completedSessionId === sessionId)
    if (!linked) return

    const weekSessions = allPlanned.filter(
      (ps) => ps.weekNumber === linked.weekNumber && !WEEK_EXCLUDED_TYPES.includes(ps.sessionType)
    )
    if (weekSessions.length === 0) return
    if (weekSessions.some((ps) => ps.status === PlannedSessionStatus.Pending)) return

    const weekSummary = await this.weekSummaryBuilder.build(userId, linked.weekNumber, weekSessions)
    await this.eventEmitter.emit('week:completed', { userId, planId: plan.id, weekSummary })
  }
}
