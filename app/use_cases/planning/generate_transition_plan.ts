import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import {
  PlanStatus,
  PlannedSessionStatus,
  TrainingState,
} from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import type { TrainingPlan } from '#domain/entities/training_plan'
import { NoCompletedPlanError } from '#domain/errors/no_completed_plan_error'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addWeeks(dateIso: string, weeks: number): string {
  const d = new Date(dateIso)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export interface GenerateTransitionPlanResult {
  plan: TrainingPlan
}

@inject()
export default class GenerateTransitionPlan {
  constructor(
    private planRepo: TrainingPlanRepository,
    private goalRepo: TrainingGoalRepository,
    private userProfileRepo: UserProfileRepository,
    private planEngine: TrainingPlanEngine
  ) {}

  async execute(userId: number): Promise<GenerateTransitionPlanResult> {
    const allPlans = await this.planRepo.findByUserId(userId)
    const completedPlan = allPlans.find((p) => p.status === PlanStatus.Completed)
    if (!completedPlan) throw new NoCompletedPlanError()

    const goal = completedPlan.goalId ? await this.goalRepo.findById(completedPlan.goalId) : null

    // Volume pic = volume de la semaine non-récupération la plus chargée du plan précédent
    const weeks = await this.planRepo.findWeeksByPlanId(completedPlan.id)
    const nonRecoveryWeeks = weeks.filter((w) => !w.isRecoveryWeek)
    const peakVolumeMinutes =
      nonRecoveryWeeks.length > 0
        ? Math.max(...nonRecoveryWeeks.map((w) => w.targetVolumeMinutes))
        : weeks.length > 0
          ? Math.max(...weeks.map((w) => w.targetVolumeMinutes))
          : 200

    const paceZones = derivePaceZones(completedPlan.currentVdot)
    const raceDistanceKm = goal?.targetDistanceKm ?? 10

    const generated = this.planEngine.generateTransitionPlan({
      vdot: completedPlan.currentVdot,
      paceZones,
      sessionsPerWeek: completedPlan.sessionsPerWeek,
      preferredDays: completedPlan.preferredDays,
      previousPeakVolumeMinutes: peakVolumeMinutes,
      raceDistanceKm,
    })

    const startDate = todayIso()
    const endDate = addWeeks(startDate, generated.totalWeeks)

    const plan = await this.planRepo.create({
      userId,
      goalId: completedPlan.goalId,
      methodology: generated.methodology,
      level: completedPlan.level,
      status: PlanStatus.Active,
      autoRecalibrate: false,
      vdotAtCreation: completedPlan.currentVdot,
      currentVdot: completedPlan.currentVdot,
      sessionsPerWeek: completedPlan.sessionsPerWeek,
      preferredDays: completedPlan.preferredDays,
      startDate,
      endDate,
      lastRecalibratedAt: null,
      pendingVdotDown: null,
    })

    for (const week of generated.weeks) {
      await this.planRepo.createWeek({
        planId: plan.id,
        weekNumber: week.weekNumber,
        phaseName: week.phaseName,
        phaseLabel: week.phaseName,
        isRecoveryWeek: week.isRecoveryWeek,
        targetVolumeMinutes: week.targetVolumeMinutes,
      })

      for (const session of week.sessions) {
        await this.planRepo.createSession({
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

    await this.userProfileRepo.update(userId, { trainingState: TrainingState.Transition })

    return { plan }
  }
}
