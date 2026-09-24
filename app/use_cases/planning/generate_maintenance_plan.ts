import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { PlanStatus, TrainingState } from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import { NoCompletedPlanError } from '#domain/errors/no_completed_plan_error'
import PlanPersister from '#use_cases/planning/plan_persister'

// Ratio volume maintenance / pic (Daniels) — utilisé pour reconstruire le volume pic
// depuis un plan maintenance existant lors de la boucle de maintien.
const MAINTENANCE_RATIO = 0.35

export type GenerateMaintenancePlanResult = {
  plan: TrainingPlan
}

@inject()
export default class GenerateMaintenancePlan {
  constructor(
    private planRepo: TrainingPlanRepository,
    private userProfileRepo: UserProfileRepository,
    private planEngine: TrainingPlanEngine,
    private planPersister: PlanPersister,
    private unitOfWork: UnitOfWork
  ) {}

  async execute(userId: number): Promise<GenerateMaintenancePlanResult> {
    const allPlans = await this.planRepo.findByUserId(userId)
    const completedPlan = allPlans.find((p) => p.status === PlanStatus.Completed)
    if (!completedPlan) throw new NoCompletedPlanError()

    return this.unitOfWork.run(() => this.fromPlan(userId, completedPlan))
  }

  /**
   * Génère un cycle de maintenance à partir d'un plan terminé (ou du cycle de
   * maintenance qui vient de s'achever). À appeler dans une UnitOfWork.
   */
  async fromPlan(userId: number, sourcePlan: TrainingPlan): Promise<GenerateMaintenancePlanResult> {
    const weeks = await this.planRepo.findWeeksByPlanId(sourcePlan.id)
    const generated = this.planEngine.generateMaintenancePlan({
      vdot: sourcePlan.currentVdot,
      paceZones: derivePaceZones(sourcePlan.currentVdot),
      sessionsPerWeek: sourcePlan.sessionsPerWeek,
      preferredDays: sourcePlan.preferredDays,
      currentWeeklyVolumeMinutes: this.#estimatePeakVolume(weeks),
    })

    const profile = await this.userProfileRepo.findByUserId(userId)
    const startDate = todayInTimezone(profile?.timezone)

    const { plan } = await this.planPersister.createPlan(
      {
        userId,
        goalId: null,
        methodology: generated.methodology,
        level: sourcePlan.level,
        status: PlanStatus.Active,
        autoRecalibrate: false,
        vdotAtCreation: sourcePlan.currentVdot,
        currentVdot: sourcePlan.currentVdot,
        sessionsPerWeek: sourcePlan.sessionsPerWeek,
        preferredDays: sourcePlan.preferredDays,
        startDate,
        endDate: addDaysIso(startDate, generated.totalWeeks * 7),
        lastRecalibratedAt: null,
        pendingVdotDown: null,
      },
      generated.weeks
    )
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
    weeks: Pick<PlannedWeek, 'phaseName' | 'isRecoveryWeek' | 'targetVolumeMinutes'>[]
  ): number {
    if (weeks.length === 0) return 200

    const nonRecoveryWeeks = weeks.filter((w) => !w.isRecoveryWeek)
    const reference = nonRecoveryWeeks.length > 0 ? nonRecoveryWeeks : weeks
    const maxVolume = Math.max(...reference.map((w) => w.targetVolumeMinutes))

    const isMaintenancePlan = weeks.some((w) => w.phaseName === 'MAINT')
    return isMaintenancePlan ? Math.round(maxVolume / MAINTENANCE_RATIO) : maxVolume
  }
}
