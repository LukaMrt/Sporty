import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UnitOfWork } from '#domain/interfaces/unit_of_work'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'
import { NoActiveGoalError } from '#domain/errors/no_active_goal_error'
import { PlanStatus, PlanType, TrainingState } from '#domain/value_objects/planning_types'
import { derivePaceZones } from '#domain/services/vdot_calculator'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import { addDaysIso, dayOfWeekIso, todayInTimezone } from '#domain/services/calendar'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'
import PlanPersister from '#use_cases/planning/plan_persister'

export type GeneratePlanInput = {
  userId: number
  vdot: number
  sessionsPerWeek: number
  preferredDays: number[]
  planDurationWeeks: number
}

export type GeneratePlanResult = {
  plan: TrainingPlan
  weeks: PlannedWeek[]
  sessions: PlannedSession[]
  fitnessProfile: FitnessProfile | null
  // true si le volume de base de l'utilisateur était insuffisant et a été relevé au minimum
  // recommandé pour la distance cible (§8.3, §4.1 doc recherche)
  volumeAdjusted: boolean
}

// Volume hebdomadaire minimal recommandé pour chaque distance (Daniels §4.1 + §8.3).
// En dessous de ces seuils, le plan est généré mais avec un avertissement.
const MIN_BASE_VOLUME_MINUTES: Record<string, number> = {
  '5k': 0, // accessible à tous
  '10k': 100, // ~1h40/semaine minimum
  'half': 150, // ~2h30/semaine minimum
  'marathon': 200, // ~3h20/semaine minimum
}

function getDistanceKey(distanceKm: number): string {
  if (distanceKm <= 5) return '5k'
  if (distanceKm <= 10) return '10k'
  if (distanceKm <= 21.1) return 'half'
  return 'marathon'
}

function getPlanType(distanceKm: number): PlanType {
  if (distanceKm <= 5) return PlanType.FiveKm
  if (distanceKm <= 10) return PlanType.TenKm
  if (distanceKm <= 21.1) return PlanType.HalfMarathon
  return PlanType.Marathon
}

/** Lundi suivant `today` (jamais `today` lui-même) */
function nextMonday(today: string): string {
  const day = dayOfWeekIso(today) // 0 = dimanche, 1 = lundi, ...
  return addDaysIso(today, day === 0 ? 1 : 8 - day)
}

@inject()
export default class GeneratePlan {
  constructor(
    private goalRepository: TrainingGoalRepository,
    private planRepository: TrainingPlanRepository,
    private sessionRepository: SessionRepository,
    private planEngine: TrainingPlanEngine,
    private userProfileRepository: UserProfileRepository,
    private getFitnessProfile: GetFitnessProfile,
    private planPersister: PlanPersister,
    private unitOfWork: UnitOfWork
  ) {}

  async execute(input: GeneratePlanInput): Promise<GeneratePlanResult> {
    // 1. Vérifier qu'un objectif actif existe
    const goal = await this.goalRepository.findActiveByUserId(input.userId)
    if (!goal) throw new NoActiveGoalError()

    // 2. Vérifier qu'aucun plan actif n'existe déjà
    const existingPlan = await this.planRepository.findActiveByUserId(input.userId)
    if (existingPlan) throw new ActivePlanExistsError()

    // 3. Historique des 6 dernières semaines (volume) et état de forme
    const profile = await this.userProfileRepository.findByUserId(input.userId)
    const today = todayInTimezone(profile?.timezone)
    const historySessions = await this.sessionRepository.findLoadEntries(
      input.userId,
      addDaysIso(today, -42),
      today
    )
    const { profile: fitnessProfile } = await this.getFitnessProfile.execute(input.userId, {
      asOf: today,
    })

    // 6. Dériver les zones d'allure depuis le VDOT
    const paceZones = derivePaceZones(input.vdot)

    // 7. Volume hebdomadaire courant (depuis l'historique)
    // On divise par le nombre de semaines ayant au moins une séance, pas par 6 fixe —
    // évite de sous-estimer le volume d'un coureur actif sur seulement 2-3 semaines.
    const weeklyVolumeMinutes = (() => {
      if (historySessions.length === 0) return 0
      const weekOf = (date: string) =>
        Math.floor(new Date(date).getTime() / (7 * 24 * 60 * 60 * 1000))
      const activeWeeks = new Set(historySessions.map((s) => weekOf(s.date))).size
      const totalMinutes = historySessions.reduce((sum, s) => sum + s.durationMinutes, 0)
      return Math.round(totalMinutes / activeWeeks)
    })()

    // 8. Appliquer le volume minimal recommandé par distance (Option D+B)
    // Si le volume réel est en dessous du seuil, on le relève au minimum pour que le plan
    // soit physiologiquement cohérent. volumeAdjusted signale l'ajustement au controller.
    const distanceKey = getDistanceKey(goal.targetDistanceKm)
    const minVolume = MIN_BASE_VOLUME_MINUTES[distanceKey]
    const volumeAdjusted = weeklyVolumeMinutes < minVolume
    const effectiveVolume = Math.max(weeklyVolumeMinutes, minVolume)

    // 9. Assembler la PlanRequest
    const startDate = nextMonday(today)
    const planRequest = {
      targetDistanceKm: goal.targetDistanceKm,
      targetTimeMinutes: goal.targetTimeMinutes,
      eventDate: goal.eventDate,
      vdot: input.vdot,
      paceZones,
      totalWeeks: input.planDurationWeeks,
      sessionsPerWeek: input.sessionsPerWeek,
      preferredDays: input.preferredDays,
      startDate,
      currentWeeklyVolumeMinutes: effectiveVolume,
    }

    // 9. Générer le plan via le moteur
    const generatedPlan = this.planEngine.generatePlan(planRequest)

    // 10. Persister plan + semaines + séances + état d'entraînement, atomiquement
    const endDate = addDaysIso(startDate, input.planDurationWeeks * 7)
    const saved = await this.unitOfWork.run(async () => {
      const result = await this.planPersister.createPlan(
        {
          userId: input.userId,
          goalId: goal.id,
          methodology: generatedPlan.methodology,
          level: getPlanType(goal.targetDistanceKm),
          status: PlanStatus.Active,
          autoRecalibrate: true,
          vdotAtCreation: input.vdot,
          currentVdot: input.vdot,
          sessionsPerWeek: input.sessionsPerWeek,
          preferredDays: input.preferredDays,
          startDate,
          endDate,
          lastRecalibratedAt: null,
          pendingVdotDown: null,
        },
        generatedPlan.weeks
      )
      await this.userProfileRepository.update(input.userId, {
        trainingState: TrainingState.Preparation,
        // Le VDOT du plan devient la référence de l'athlète (charge rTSS, prédictions)
        vdot: input.vdot,
      })
      return result
    })

    return { ...saved, fitnessProfile, volumeAdjusted }
  }
}
