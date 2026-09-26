import { inject } from '@adonisjs/core'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type { TrainingGoal } from '#domain/entities/training_goal'
import { PlanStatus } from '#domain/value_objects/planning_types'

/**
 * Clôt l'objectif actif (`achieved`) quand plus aucun plan actif ne le prépare.
 *
 * La fin d'un plan ne clôt pas l'objectif : un plan de transition peut encore
 * s'y rattacher. Il est clos à la sortie de l'après-plan (« Plus tard »,
 * maintenance) ou, en filet de sécurité, à la création d'un nouvel objectif.
 * Sans cela, l'objectif restait actif pour toujours et bloquait tout nouvel
 * objectif (« un seul objectif à la fois »).
 *
 * Seul un objectif dont un plan est allé au bout est clos : un objectif encore
 * sans plan (assistant entre deux étapes) continue de bloquer.
 */
@inject()
export default class CloseFinishedGoal {
  constructor(
    private goalRepository: TrainingGoalRepository,
    private planRepository: TrainingPlanRepository
  ) {}

  /** Retourne l'objectif clos, ou null si rien n'a été fait */
  async execute(userId: number): Promise<TrainingGoal | null> {
    const goal = await this.goalRepository.findActiveByUserId(userId)
    if (!goal) return null
    if (await this.planRepository.findActiveByGoalId(goal.id)) return null
    const plans = await this.planRepository.findByUserId(userId)
    const completed = plans.some((p) => p.goalId === goal.id && p.status === PlanStatus.Completed)
    if (!completed) return null
    return this.goalRepository.update(goal.id, { status: 'achieved' })
  }
}
