import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { PlannedSessionNotFoundError } from '#domain/errors/planned_session_not_found_error'
import { PlannedSessionForbiddenError } from '#domain/errors/planned_session_forbidden_error'
import { PlannedSessionLockedError } from '#domain/errors/planned_session_locked_error'
import { SessionDayConflictError } from '#domain/errors/session_day_conflict_error'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import type { PlannedSession } from '#domain/entities/planned_session'

export interface AdjustPlanInput {
  userId: number
  sessionId: number
  /** Jour de la semaine (0=Dimanche … 6=Samedi, convention JS Date.getDay()) — optionnel pour déplacement */
  dayOfWeek?: number
  /** Durée cible en minutes — optionnel pour modification */
  targetDurationMinutes?: number
  /** Allure cible format MM:SS — optionnel pour modification */
  targetPacePerKm?: string
}

@inject()
export default class AdjustPlan {
  constructor(private planRepository: TrainingPlanRepository) {}

  async execute(input: AdjustPlanInput): Promise<PlannedSession> {
    // 1. Vérifier que la séance existe
    const session = await this.planRepository.findSessionById(input.sessionId)
    if (!session) throw new PlannedSessionNotFoundError(input.sessionId)

    // 2. Vérifier que la séance appartient au plan actif de l'utilisateur
    const activePlan = await this.planRepository.findActiveByUserId(input.userId)
    if (!activePlan || activePlan.id !== session.planId) {
      throw new PlannedSessionForbiddenError()
    }

    // 3. Une séance déjà complétée ne se modifie plus (elle est liée à une
    // séance réalisée et comptée dans les bilans)
    if (session.status === PlannedSessionStatus.Completed) {
      throw new PlannedSessionLockedError()
    }

    // 4. Refuser un déplacement vers un jour déjà occupé dans la même semaine
    if (input.dayOfWeek !== undefined && input.dayOfWeek !== session.dayOfWeek) {
      const planSessions = await this.planRepository.findSessionsByPlanId(activePlan.id)
      const dayTaken = planSessions.some(
        (s) =>
          s.id !== session.id &&
          s.weekNumber === session.weekNumber &&
          s.dayOfWeek === input.dayOfWeek
      )
      if (dayTaken) throw new SessionDayConflictError()
    }

    // 5. Construire les champs à modifier (uniquement les champs fournis)
    const updates: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>> = {}

    if (input.dayOfWeek !== undefined) updates.dayOfWeek = input.dayOfWeek
    if (input.targetDurationMinutes !== undefined)
      updates.targetDurationMinutes = input.targetDurationMinutes
    if (input.targetPacePerKm !== undefined) updates.targetPacePerKm = input.targetPacePerKm

    // 6. Persister — pas de recalibration, c'est un ajustement local
    return this.planRepository.updateSession(input.sessionId, updates)
  }
}
