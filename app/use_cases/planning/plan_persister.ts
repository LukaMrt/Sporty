import { inject } from '@adonisjs/core'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { GeneratedWeek } from '#domain/interfaces/training_plan_engine'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import { PlannedSessionStatus } from '#domain/value_objects/planning_types'
import { estimatePlannedTss } from '#domain/services/planned_load'

export type NewPlanData = Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Persistance des plans générés, partagée par les use cases de génération et de
 * recalibration. Écritures en lot (3 requêtes au lieu de 60 à 150) ; l'appelant
 * les enveloppe dans une `UnitOfWork` pour qu'un plan ne soit jamais à moitié créé.
 */
@inject()
export default class PlanPersister {
  constructor(private planRepository: TrainingPlanRepository) {}

  async createPlan(
    data: NewPlanData,
    weeks: GeneratedWeek[]
  ): Promise<{ plan: TrainingPlan; weeks: PlannedWeek[]; sessions: PlannedSession[] }> {
    const plan = await this.planRepository.create(data)
    const savedWeeks = await this.planRepository.createWeeks(
      weeks.map((week) => ({
        planId: plan.id,
        weekNumber: week.weekNumber,
        phaseName: week.phaseName,
        phaseLabel: week.phaseName,
        isRecoveryWeek: week.isRecoveryWeek,
        targetVolumeMinutes: week.targetVolumeMinutes,
      }))
    )
    const sessions = await this.#createSessions(plan.id, weeks)
    return { plan, weeks: savedWeeks, sessions }
  }

  /** Remplace les séances à partir de `fromWeekNumber` (recalibration, reprise) */
  async replaceSessionsFromWeek(
    planId: number,
    fromWeekNumber: number,
    weeks: GeneratedWeek[]
  ): Promise<PlannedSession[]> {
    await this.planRepository.deleteSessionsFromWeek(planId, fromWeekNumber)
    return this.#createSessions(
      planId,
      weeks.filter((w) => w.weekNumber >= fromWeekNumber)
    )
  }

  #createSessions(planId: number, weeks: GeneratedWeek[]): Promise<PlannedSession[]> {
    return this.planRepository.createSessions(
      weeks.flatMap((week) =>
        week.sessions.map((session) => ({
          planId,
          weekNumber: week.weekNumber,
          dayOfWeek: session.dayOfWeek,
          sessionType: session.sessionType,
          targetDurationMinutes: session.targetDurationMinutes,
          targetDistanceKm: session.targetDistanceKm,
          targetPacePerKm: session.targetPacePerKm,
          intensityZone: session.intensityZone,
          intervals: session.intervals,
          // Sans charge prévue, l'écart prévu/réalisé valait 0 et la recalibration
          // ne se déclenchait jamais
          targetLoadTss: estimatePlannedTss(session),
          completedSessionId: null,
          status: PlannedSessionStatus.Pending,
        }))
      )
    )
  }
}
