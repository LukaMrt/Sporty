import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import {
  MAINTENANCE_VOLUME_RATIO,
  PlanStatus,
  PlannedSessionStatus,
  TrainingState,
} from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { addWeeksIso, todayIso } from '#domain/services/plan_calendar'
import type { TrainingPlan } from '#domain/entities/training_plan'
import { NoCompletedPlanError } from '#domain/errors/no_completed_plan_error'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'

export interface GenerateMaintenancePlanResult {
  plan: TrainingPlan
}

@inject()
export default class GenerateMaintenancePlan {
  constructor(
    private planRepo: TrainingPlanRepository,
    private userProfileRepo: UserProfileRepository,
    private planEngine: TrainingPlanEngine
  ) {}

  async execute(userId: number): Promise<GenerateMaintenancePlanResult> {
    const existingActive = await this.planRepo.findActiveByUserId(userId)
    if (existingActive) throw new ActivePlanExistsError()

    const allPlans = await this.planRepo.findByUserId(userId)
    const completedPlan = allPlans.find((p) => p.status === PlanStatus.Completed)
    if (!completedPlan) throw new NoCompletedPlanError()

    const weeks = await this.planRepo.findWeeksByPlanId(completedPlan.id)
    const peakVolumeMinutes = this.#estimatePeakVolume(weeks)

    const paceZones = derivePaceZones(completedPlan.currentVdot)

    const generated = this.planEngine.generateMaintenancePlan({
      vdot: completedPlan.currentVdot,
      paceZones,
      sessionsPerWeek: completedPlan.sessionsPerWeek,
      preferredDays: completedPlan.preferredDays,
      currentWeeklyVolumeMinutes: peakVolumeMinutes,
    })

    const startDate = todayIso()
    const endDate = addWeeksIso(startDate, generated.totalWeeks)

    const { plan } = await this.planRepo.createPlanGraph(
      {
        userId,
        goalId: null,
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
      },
      generated.weeks.map((week) => ({
        week: {
          weekNumber: week.weekNumber,
          phaseName: week.phaseName,
          phaseLabel: week.phaseName,
          isRecoveryWeek: week.isRecoveryWeek,
          targetVolumeMinutes: week.targetVolumeMinutes,
        },
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

    await this.userProfileRepo.update(userId, { trainingState: TrainingState.Maintenance })

    return { plan }
  }

  /**
   * Estime le volume pic selon le type de plan terminé.
   * - Plan de préparation : volume max des semaines non-récupération
   * - Plan de maintenance : on reconstruit le pic depuis le volume maintenance (÷ ratio)
   * - Plan de transition : on utilise les semaines les plus chargées
   */
  #estimatePeakVolume(
    weeks: Array<{ phaseName: string; isRecoveryWeek: boolean; targetVolumeMinutes: number }>
  ): number {
    if (weeks.length === 0) return 200

    const isMaintenancePlan = weeks.some((w) => w.phaseName === 'MAINT')
    if (isMaintenancePlan) {
      const maintenanceWeeks = weeks.filter((w) => !w.isRecoveryWeek)
      const maintenanceVolume =
        maintenanceWeeks.length > 0
          ? Math.max(...maintenanceWeeks.map((w) => w.targetVolumeMinutes))
          : Math.max(...weeks.map((w) => w.targetVolumeMinutes))
      return Math.round(maintenanceVolume / MAINTENANCE_VOLUME_RATIO)
    }

    const nonRecoveryWeeks = weeks.filter((w) => !w.isRecoveryWeek)
    return nonRecoveryWeeks.length > 0
      ? Math.max(...nonRecoveryWeeks.map((w) => w.targetVolumeMinutes))
      : Math.max(...weeks.map((w) => w.targetVolumeMinutes))
  }
}
