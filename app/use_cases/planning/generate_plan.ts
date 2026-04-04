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
import { derivePaceZones } from '#domain/services/vdot_calculator'
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
}

function getPlanType(distanceKm: number): PlanType {
  if (distanceKm <= 5) return PlanType.FiveKm
  if (distanceKm <= 10) return PlanType.TenKm
  if (distanceKm <= 21.1) return PlanType.HalfMarathon
  return PlanType.Marathon
}

function addWeeks(dateIso: string, weeks: number): string {
  const d = new Date(dateIso)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function nextMondayIso(): string {
  const d = new Date()
  const day = d.getDay() // 0 = dimanche, 1 = lundi, ...
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysUntilNextMonday)
  return d.toISOString().slice(0, 10)
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
    const weeklyVolumeMinutes =
      historySessions.length > 0
        ? Math.round(historySessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 6)
        : 0

    // 8. Assembler la PlanRequest
    const startDate = nextMondayIso()
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
      currentWeeklyVolumeMinutes: weeklyVolumeMinutes,
    }

    // 9. Générer le plan via le moteur
    const generatedPlan = this.planEngine.generatePlan(planRequest)

    // 10. Persister le plan
    const endDate = addWeeks(startDate, input.planDurationWeeks)
    const plan = await this.planRepository.create({
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
    })

    // 11. Persister les semaines et séances
    const savedWeeks: PlannedWeek[] = []
    const savedSessions: PlannedSession[] = []

    for (const week of generatedPlan.weeks) {
      const savedWeek = await this.planRepository.createWeek({
        planId: plan.id,
        weekNumber: week.weekNumber,
        phaseName: week.phaseName,
        phaseLabel: week.phaseName,
        isRecoveryWeek: week.isRecoveryWeek,
        targetVolumeMinutes: week.targetVolumeMinutes,
      })
      savedWeeks.push(savedWeek)

      for (const session of week.sessions) {
        const savedSession = await this.planRepository.createSession({
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
        savedSessions.push(savedSession)
      }
    }

    // 12. Mettre à jour le trainingState → 'preparation'
    await this.userProfileRepository.update(input.userId, {
      trainingState: TrainingState.Preparation,
    })

    return { plan, weeks: savedWeeks, sessions: savedSessions, fitnessProfile }
  }
}
