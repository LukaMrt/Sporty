import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { PlanStatus, TrainingState } from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import type { TrainingPlan } from '#domain/entities/training_plan'
import { NoCompletedPlanError } from '#domain/errors/no_completed_plan_error'
import PlanPersister from '#use_cases/planning/plan_persister'

export interface GenerateTransitionPlanResult {
  plan: TrainingPlan
}

@inject()
export default class GenerateTransitionPlan {
  constructor(
    private planRepo: TrainingPlanRepository,
    private goalRepo: TrainingGoalRepository,
    private userProfileRepo: UserProfileRepository,
    private planEngine: TrainingPlanEngine,
    private planPersister: PlanPersister,
    private unitOfWork: UnitOfWork
  ) {}

  async execute(userId: number): Promise<GenerateTransitionPlanResult> {
    const allPlans = await this.planRepo.findByUserId(userId)
    const completedPlan = allPlans.find((p) => p.status === PlanStatus.Completed)
    if (!completedPlan) throw new NoCompletedPlanError()

    const goal = completedPlan.goalId ? await this.goalRepo.findById(completedPlan.goalId) : null

    // Volume pic = volume de la semaine non-récupération la plus chargée du plan précédent
    const weeks = await this.planRepo.findWeeksByPlanId(completedPlan.id)
    const nonRecoveryWeeks = weeks.filter((w) => !w.isRecoveryWeek)
    const reference = nonRecoveryWeeks.length > 0 ? nonRecoveryWeeks : weeks
    const peakVolumeMinutes =
      reference.length > 0 ? Math.max(...reference.map((w) => w.targetVolumeMinutes)) : 200

    const generated = this.planEngine.generateTransitionPlan({
      vdot: completedPlan.currentVdot,
      paceZones: derivePaceZones(completedPlan.currentVdot),
      sessionsPerWeek: completedPlan.sessionsPerWeek,
      preferredDays: completedPlan.preferredDays,
      previousPeakVolumeMinutes: peakVolumeMinutes,
      raceDistanceKm: goal?.targetDistanceKm ?? 10,
    })

    const profile = await this.userProfileRepo.findByUserId(userId)
    const startDate = todayInTimezone(profile?.timezone)

    return this.unitOfWork.run(async () => {
      const { plan } = await this.planPersister.createPlan(
        {
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
          endDate: addDaysIso(startDate, generated.totalWeeks * 7),
          lastRecalibratedAt: null,
          pendingVdotDown: null,
        },
        generated.weeks
      )
      await this.userProfileRepo.update(userId, { trainingState: TrainingState.Transition })
      return { plan }
    })
  }
}
