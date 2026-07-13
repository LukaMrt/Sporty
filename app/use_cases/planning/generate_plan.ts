import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import { TrainingPlanEngine } from '#domain/interfaces/training_plan_engine'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { ActivePlanExistsError } from '#domain/errors/active_plan_exists_error'
import { NoActiveGoalError } from '#domain/errors/no_active_goal_error'
import {
  PlanStatus,
  PlanType,
  PlannedSessionStatus,
  TrainingState,
} from '#domain/value_objects/planning_types'
import { derivePaceZones, predictTimeMinutes } from '#domain/services/vdot_calculator'
import { todayIso, nextMondayIso, addWeeksIso, daysBetween } from '#domain/services/plan_calendar'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedSession } from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'

export interface GeneratePlanInput {
  userId: number
  vdot: number
  sessionsPerWeek: number
  preferredDays: number[]
  planDurationWeeks: number
}

export interface GeneratePlanResult {
  plan: TrainingPlan
  weeks: PlannedWeek[]
  sessions: PlannedSession[]
  fitnessProfile: FitnessProfile | null
  // true si le volume de base de l'utilisateur était insuffisant et a été relevé au minimum
  // recommandé pour la distance cible (§8.3, §4.1 doc recherche)
  volumeAdjusted: boolean
  // true si la durée du plan a été recalée sur la date de course (le plan doit
  // se terminer la semaine de l'événement, pas avant ni après)
  durationAdjustedToEvent: boolean
  // Prédiction Daniels pour la distance cible au VDOT courant ; null = pas de temps cible
  predictedTimeMinutes: number | null
  // false si le temps cible de l'objectif est plus rapide que la prédiction VDOT
  targetTimeFeasible: boolean | null
}

// Volume hebdomadaire minimal recommandé pour chaque distance (Daniels §4.1 + §8.3).
// En dessous de ces seuils, le plan est généré mais avec un avertissement.
const MIN_BASE_VOLUME_MINUTES: Record<string, number> = {
  '5k': 60, // ~1h/semaine : évite un plan à volume nul pour un débutant sans historique
  '10k': 100, // ~1h40/semaine minimum
  'half': 150, // ~2h30/semaine minimum
  'marathon': 200, // ~3h20/semaine minimum
}

const MIN_PLAN_WEEKS = 4
const MAX_PLAN_WEEKS = 52

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

@inject()
export default class GeneratePlan {
  constructor(
    private goalRepository: TrainingGoalRepository,
    private planRepository: TrainingPlanRepository,
    private sessionRepository: SessionRepository,
    private loadCalculator: TrainingLoadCalculator,
    private fitnessCalculator: FitnessProfileCalculator,
    private planEngine: TrainingPlanEngine,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(input: GeneratePlanInput): Promise<GeneratePlanResult> {
    // 1. Vérifier qu'un objectif actif existe
    const goal = await this.goalRepository.findActiveByUserId(input.userId)
    if (!goal) throw new NoActiveGoalError()

    // 2. Vérifier qu'aucun plan actif n'existe déjà
    const existingPlan = await this.planRepository.findActiveByUserId(input.userId)
    if (existingPlan) throw new ActivePlanExistsError()

    // 3. Récupérer l'historique des 6 dernières semaines
    const sixWeeksAgo = new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const historySessions = await this.sessionRepository.findByUserIdAndDateRange(
      input.userId,
      sixWeeksAgo,
      todayIso()
    )

    // 4. Calculer la charge pour chaque séance
    const loadHistory = historySessions.map((s) => ({
      date: s.date,
      load: this.loadCalculator.calculate({
        durationHours: s.durationMinutes / 60,
        perceivedEffort: s.perceivedEffort ?? undefined,
        avgPaceMPerMin: s.distanceKm ? (s.distanceKm * 1000) / s.durationMinutes : undefined,
        vdot: input.vdot,
      }),
    }))

    // 5. Calculer le profil de forme (CTL/ATL/TSB)
    const fitnessProfile =
      loadHistory.length > 0 ? this.fitnessCalculator.calculate(loadHistory) : null

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

    // 9. Durée du plan : la date de course prime. Le plan doit se terminer la
    // semaine de l'événement pour que le taper et la séance Race tombent juste.
    const startDate = nextMondayIso()
    let totalWeeks = input.planDurationWeeks
    let durationAdjustedToEvent = false
    if (goal.eventDate && daysBetween(startDate, goal.eventDate) >= 0) {
      const weeksUntilEvent = Math.floor(daysBetween(startDate, goal.eventDate) / 7) + 1
      totalWeeks = Math.max(MIN_PLAN_WEEKS, Math.min(weeksUntilEvent, MAX_PLAN_WEEKS))
      durationAdjustedToEvent = totalWeeks !== input.planDurationWeeks
    }

    // 10. Faisabilité du temps cible vs prédiction VDOT
    const predictedTimeMinutes = goal.targetTimeMinutes
      ? Math.round(predictTimeMinutes(goal.targetDistanceKm * 1000, input.vdot))
      : null
    const targetTimeFeasible =
      goal.targetTimeMinutes && predictedTimeMinutes
        ? goal.targetTimeMinutes >= predictedTimeMinutes
        : null

    // 11. Générer le plan via le moteur
    const planRequest = {
      targetDistanceKm: goal.targetDistanceKm,
      targetTimeMinutes: goal.targetTimeMinutes,
      eventDate: goal.eventDate,
      vdot: input.vdot,
      paceZones,
      totalWeeks,
      sessionsPerWeek: input.sessionsPerWeek,
      preferredDays: input.preferredDays,
      startDate,
      currentWeeklyVolumeMinutes: effectiveVolume,
    }
    const generatedPlan = this.planEngine.generatePlan(planRequest)

    // 12. Persister le plan complet (transactionnel)
    const endDate = addWeeksIso(startDate, totalWeeks)
    const { plan, weeks, sessions } = await this.planRepository.createPlanGraph(
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
      generatedPlan.weeks.map((week) => ({
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

    // 13. Mettre à jour le trainingState → 'preparation'
    await this.userProfileRepository.update(input.userId, {
      trainingState: TrainingState.Preparation,
    })

    return {
      plan,
      weeks,
      sessions,
      fitnessProfile,
      volumeAdjusted,
      durationAdjustedToEvent,
      predictedTimeMinutes,
      targetTimeFeasible,
    }
  }
}
