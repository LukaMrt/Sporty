import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { computeCurrentWeekNumber } from '#domain/services/plan_calendar'
import { toGeneratedWeeks } from '#domain/services/plan_mapper'
import { NoActivePlanError } from '#use_cases/planning/toggle_auto_recalibrate'

@inject()
export default class HandleVdotDownProposal {
  constructor(
    private planRepository: TrainingPlanRepository,
    private goalRepository: TrainingGoalRepository,
    private planEngine: TrainingPlanEngine
  ) {}

  async execute(userId: number, action: 'confirm' | 'dismiss'): Promise<void> {
    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) throw new NoActivePlanError()

    if (!plan.pendingVdotDown) {
      // Pas de proposition pendante — on ignore silencieusement
      return
    }

    if (action === 'dismiss') {
      await this.planRepository.update(plan.id, { pendingVdotDown: null })
      return
    }

    // Confirmer : appliquer le nouveau VDOT
    const newVdot = plan.pendingVdotDown
    const paceZones = derivePaceZones(newVdot)

    const allSessions = await this.planRepository.findSessionsByPlanId(plan.id)
    const allWeeks = await this.planRepository.findWeeksByPlanId(plan.id)
    const goal = plan.goalId ? await this.goalRepository.findById(plan.goalId) : null

    const currentWeek = computeCurrentWeekNumber(plan.startDate, allWeeks.length)
    const nextWeekNumber = currentWeek + 1

    const remainingWeeks = toGeneratedWeeks(allWeeks, allSessions, nextWeekNumber)

    if (remainingWeeks.length > 0) {
      const recalibrated = this.planEngine.recalibrate({
        currentWeekNumber: currentWeek,
        newVdot,
        newPaceZones: paceZones,
        remainingWeeks,
        originalRequest: {
          targetDistanceKm: goal?.targetDistanceKm ?? 42.195,
          targetTimeMinutes: goal?.targetTimeMinutes ?? null,
          eventDate: goal?.eventDate ?? null,
          vdot: newVdot,
          paceZones,
          totalWeeks: allWeeks.length,
          sessionsPerWeek: plan.sessionsPerWeek,
          preferredDays: plan.preferredDays,
          startDate: plan.startDate,
          currentWeeklyVolumeMinutes: remainingWeeks[0]?.targetVolumeMinutes ?? 0,
        },
      })

      await this.planRepository.replaceFromWeek(
        plan.id,
        nextWeekNumber,
        recalibrated.weeks
          .filter((w) => w.weekNumber >= nextWeekNumber)
          .map((week) => ({
            weekNumber: week.weekNumber,
            isRecoveryWeek: week.isRecoveryWeek,
            targetVolumeMinutes: week.targetVolumeMinutes,
            sessions: week.sessions.map((session) => ({
              weekNumber: week.weekNumber,
              dayOfWeek: session.dayOfWeek,
              sessionType: session.sessionType,
              targetDurationMinutes: session.targetDurationMinutes,
              targetDistanceKm: session.targetDistanceKm,
              targetPacePerKm: session.targetPacePerKm,
              intensityZone: session.intensityZone,
              intervals: session.intervals,
              targetLoadTss: session.targetLoadTss,
              completedSessionId: null,
              status: PlannedSessionStatus.Pending,
            })),
          }))
      )
    }

    await this.planRepository.update(plan.id, {
      currentVdot: newVdot,
      lastRecalibratedAt: new Date().toISOString(),
      pendingVdotDown: null,
    })
  }
}
