import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { PlannedSession } from '#domain/entities/planned_session'
import { PlannedSessionStatus, SessionType } from '#domain/value_objects/planning_types'
import { plannedSessionDate } from '#domain/services/planned_session_date'
import { daysBetween } from '#domain/services/calendar'
import { RUNNING_SLUG } from '#domain/services/session_load'

/** Écart maximal (jours) entre la date prévue et la date réalisée */
const MAX_DAY_GAP = 1

const NON_LINKABLE: string[] = [SessionType.Rest]

/**
 * Lie automatiquement une séance réalisée à la séance planifiée en attente du
 * même sport la plus proche en date (± 1 jour). C'était le chaînon manquant de
 * la recalibration : aucune liaison n'était jamais faite depuis l'UI. Les plans
 * étant multisports, une sortie vélo se lie à la séance de vélo prévue.
 */
@inject()
export default class AutoLinkCompletedSession {
  constructor(
    private planRepository: TrainingPlanRepository,
    private sessionRepository: SessionRepository
  ) {}

  async execute(userId: number, sessionId: number): Promise<PlannedSession | null> {
    const session = await this.sessionRepository.findById(sessionId)
    if (!session || session.userId !== userId) return null
    const sport = session.sportSlug ?? RUNNING_SLUG

    const plan = await this.planRepository.findActiveByUserId(userId)
    if (!plan) return null

    const planned = await this.planRepository.findSessionsByPlanId(plan.id)
    // Déjà liée (ex. liaison manuelle) : rien à faire
    if (planned.some((ps) => ps.completedSessionId === sessionId)) return null

    const candidates = planned
      .filter((ps) => ps.status === PlannedSessionStatus.Pending)
      .filter((ps) => !NON_LINKABLE.includes(ps.sessionType))
      .filter((ps) => ps.sportSlug === sport)
      .map((ps) => ({
        ps,
        gap: Math.abs(
          daysBetween(plannedSessionDate(plan.startDate, ps.weekNumber, ps.dayOfWeek), session.date)
        ),
      }))
      .filter((c) => c.gap <= MAX_DAY_GAP)
      // Le jour même d'abord, puis la séance la plus longue (la « séance du jour »)
      .sort((a, b) => a.gap - b.gap || b.ps.targetDurationMinutes - a.ps.targetDurationMinutes)

    const best = candidates[0]
    if (!best) return null

    return this.planRepository.updateSession(best.ps.id, {
      completedSessionId: sessionId,
      status: PlannedSessionStatus.Completed,
    })
  }
}
