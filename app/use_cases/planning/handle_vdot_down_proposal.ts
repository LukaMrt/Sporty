import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'
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

    // Déterminer la semaine courante
    const today = new Date()
    const startDate = new Date(plan.startDate)
    const daysSinceStart = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const currentWeek = Math.min(Math.max(1, Math.floor(daysSinceStart / 7) + 1), allWeeks.length)
    const nextWeekNumber = currentWeek + 1

    const remainingWeeks: GeneratedWeek[] = allWeeks
      .filter((w) => w.weekNumber >= nextWeekNumber)
      .map((w) => ({
        weekNumber: w.weekNumber,
        phaseName: w.phaseName,
        isRecoveryWeek: w.isRecoveryWeek,
        targetVolumeMinutes: w.targetVolumeMinutes,
        sessions: allSessions
          .filter((s) => s.weekNumber === w.weekNumber)
          .map((s) => ({
            dayOfWeek: s.dayOfWeek,
            sessionType: s.sessionType,
            targetDurationMinutes: s.targetDurationMinutes,
            targetDistanceKm: s.targetDistanceKm,
            targetPacePerKm: s.targetPacePerKm,
            intensityZone: s.intensityZone,
            intervals: s.intervals,
          })),
      }))

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

      await this.planRepository.deleteSessionsFromWeek(plan.id, nextWeekNumber)

      for (const week of recalibrated.weeks.filter((w) => w.weekNumber >= nextWeekNumber)) {
        for (const session of week.sessions) {
          await this.planRepository.createSession({
            planId: plan.id,
            weekNumber: week.weekNumber,
            dayOfWeek: session.dayOfWeek,
            sessionType: session.sessionType,
            targetDurationMinutes: session.targetDurationMinutes,
            targetDistanceKm: session.targetDistanceKm,
            targetPacePerKm: session.targetPacePerKm,
            intensityZone: session.intensityZone,
            intervals: session.intervals,
            targetLoadTss: null,
            completedSessionId: null,
            status: PlannedSessionStatus.Pending,
          })
        }
      }
    }

    await this.planRepository.update(plan.id, {
      currentVdot: newVdot,
      lastRecalibratedAt: new Date().toISOString(),
      pendingVdotDown: null,
    })
  }
}
