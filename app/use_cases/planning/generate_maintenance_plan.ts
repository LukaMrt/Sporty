import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
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

// Ratio volume maintenance / pic (Daniels) — utilisé pour reconstruire le volume pic
// depuis un plan maintenance existant lors de la boucle de maintien.
const MAINTENANCE_RATIO = 0.35

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addWeeks(dateIso: string, weeks: number): string {
  const d = new Date(dateIso)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

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
    const allPlans = await this.planRepo.findByUserId(userId)
    const completedPlan = allPlans.find((p) => p.status === PlanStatus.Completed)
    if (!completedPlan) throw new NoCompletedPlanError()

    const weeks = await this.planRepo.findWeeksByPlanId(completedPlan.id)
    const peakVolumeMinutes = this.#estimatePeakVolume(completedPlan, weeks)

    const paceZones = derivePaceZones(completedPlan.currentVdot)

    const generated = this.planEngine.generateMaintenancePlan({
      vdot: completedPlan.currentVdot,
      paceZones,
      sessionsPerWeek: completedPlan.sessionsPerWeek,
      preferredDays: completedPlan.preferredDays,
      currentWeeklyVolumeMinutes: peakVolumeMinutes,
    })

    const startDate = todayIso()
    const endDate = addWeeks(startDate, generated.totalWeeks)

    const plan = await this.planRepo.create({
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

    await this.userProfileRepo.update(userId, { trainingState: TrainingState.Maintenance })

    return { plan }
  }

  /**
   * Estime le volume pic selon le type de plan terminé.
   * - Plan de préparation : volume max des semaines non-récupération
   * - Plan de maintenance : on reconstruit le pic depuis le volume maintenance (÷ MAINTENANCE_RATIO)
   * - Plan de transition : on utilise les semaines les plus chargées
   */
  #estimatePeakVolume(
    _completedPlan: TrainingPlan,
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
      return Math.round(maintenanceVolume / MAINTENANCE_RATIO)
    }

    const nonRecoveryWeeks = weeks.filter((w) => !w.isRecoveryWeek)
    return nonRecoveryWeeks.length > 0
      ? Math.max(...nonRecoveryWeeks.map((w) => w.targetVolumeMinutes))
      : Math.max(...weeks.map((w) => w.targetVolumeMinutes))
  }
}
