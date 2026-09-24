import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import { Logger } from '#domain/interfaces/logger'
import type { WeekSummary } from '#domain/value_objects/week_summary'
import {
  PlanStatus,
  PlannedSessionStatus,
  TrainingState,
} from '#domain/value_objects/planning_types'
import { todayInTimezone } from '#domain/services/calendar'
import { plannedWeekEndDate } from '#domain/services/planned_session_date'
import GenerateMaintenancePlan from '#use_cases/planning/generate_maintenance_plan'
import WeekSummaryBuilder from '#use_cases/planning/week_summary_builder'
import { WEEK_EXCLUDED_TYPES } from '#use_cases/planning/detect_week_completion'

export type LifecycleOutcome = 'none' | 'completed' | 'maintenance_renewed'

/**
 * Transitions d'état d'un plan, sorties de la lecture (`GetPlanOverview`) :
 *
 * 1. Clôture des semaines écoulées : les séances encore en attente passent en
 *    `skipped` et `week:completed` est émis. Sans cela, une seule séance non
 *    faite bloquait la semaine (et la recalibration) pour toujours.
 * 2. Fin de plan : le plan passe `completed`, ou un nouveau cycle de
 *    maintenance est généré si l'athlète est en maintenance.
 *
 * Idempotent, exécuté sous transaction avec verrou sur le plan : deux appels
 * concurrents ne créent pas deux plans. Appelé par le planificateur quotidien
 * et avant l'affichage du planning.
 */
@inject()
export default class AdvancePlanLifecycle {
  constructor(
    private planRepository: TrainingPlanRepository,
    private userProfileRepository: UserProfileRepository,
    private generateMaintenancePlan: GenerateMaintenancePlan,
    private weekSummaryBuilder: WeekSummaryBuilder,
    private unitOfWork: UnitOfWork,
    private eventEmitter: EventEmitter,
    private logger: Logger
  ) {}

  async execute(userId: number): Promise<LifecycleOutcome> {
    const profile = await this.userProfileRepository.findByUserId(userId)
    const today = todayInTimezone(profile?.timezone)
    const closedWeeks: { planId: number; summary: WeekSummary }[] = []

    const outcome = await this.unitOfWork.run(async (): Promise<LifecycleOutcome> => {
      const plan = await this.planRepository.lockActiveByUserId(userId)
      if (!plan) return 'none'

      // 1. Semaines écoulées encore ouvertes
      const planned = await this.planRepository.findSessionsByPlanId(plan.id)
      const weekNumbers = [...new Set(planned.map((ps) => ps.weekNumber))].sort((a, b) => a - b)
      for (const weekNumber of weekNumbers) {
        if (plannedWeekEndDate(plan.startDate, weekNumber) >= today) break
        const weekSessions = planned.filter(
          (ps) => ps.weekNumber === weekNumber && !WEEK_EXCLUDED_TYPES.includes(ps.sessionType)
        )
        const pending = weekSessions.filter((ps) => ps.status === PlannedSessionStatus.Pending)
        if (pending.length === 0) continue

        for (const ps of pending) {
          await this.planRepository.updateSession(ps.id, { status: PlannedSessionStatus.Skipped })
          ps.status = PlannedSessionStatus.Skipped
        }
        closedWeeks.push({
          planId: plan.id,
          summary: await this.weekSummaryBuilder.build(userId, weekNumber, weekSessions),
        })
      }

      // 2. Fin de plan
      if (today <= plan.endDate) return 'none'
      await this.planRepository.update(plan.id, { status: PlanStatus.Completed })
      if (profile?.trainingState === TrainingState.Maintenance) {
        await this.generateMaintenancePlan.fromPlan(userId, plan)
        return 'maintenance_renewed'
      }
      return 'completed'
    })

    // Hors transaction : la recalibration relit l'état validé
    for (const { planId, summary } of closedWeeks) {
      try {
        await this.eventEmitter.emit('week:completed', { userId, planId, weekSummary: summary })
      } catch (error) {
        this.logger.error({ err: error, userId, planId }, 'week:completed handling failed')
      }
    }
    return outcome
  }

  /** Tous les utilisateurs ayant un plan actif (tâche planifiée quotidienne) */
  async executeForAll(): Promise<void> {
    const plans = await this.planRepository.findAllActive()
    for (const userId of new Set(plans.map((p) => p.userId))) {
      try {
        await this.execute(userId)
      } catch (error) {
        this.logger.error({ err: error, userId }, 'Plan lifecycle advance failed')
      }
    }
  }
}
