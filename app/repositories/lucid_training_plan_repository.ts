import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { PlannedSession } from '#domain/entities/planned_session'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import type {
  PlanGraph,
  PlanGraphWeek,
  WeekReplacement,
} from '#domain/interfaces/training_plan_repository'
import TrainingPlanModel from '#models/training_plan'
import PlannedWeekModel from '#models/planned_week'
import PlannedSessionModel from '#models/planned_session'

export default class LucidTrainingPlanRepository extends TrainingPlanRepository {
  async create(data: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingPlan> {
    const model = await TrainingPlanModel.create({
      userId: data.userId,
      goalId: data.goalId ?? null,
      methodology: data.methodology,
      level: data.level,
      status: data.status,
      autoRecalibrate: data.autoRecalibrate,
      vdotAtCreation: data.vdotAtCreation,
      currentVdot: data.currentVdot,
      sessionsPerWeek: data.sessionsPerWeek,
      preferredDays: data.preferredDays,
      startDate: DateTime.fromISO(data.startDate),
      endDate: DateTime.fromISO(data.endDate),
      lastRecalibratedAt: data.lastRecalibratedAt
        ? DateTime.fromISO(data.lastRecalibratedAt)
        : null,
    })
    return this.#toEntity(model)
  }

  async findById(id: number): Promise<TrainingPlan | null> {
    const model = await TrainingPlanModel.find(id)
    return model ? this.#toEntity(model) : null
  }

  async findByUserId(userId: number): Promise<TrainingPlan[]> {
    const models = await TrainingPlanModel.query()
      .where('userId', userId)
      .orderBy('created_at', 'desc')
    return models.map((m) => this.#toEntity(m))
  }

  async findActiveByUserId(userId: number): Promise<TrainingPlan | null> {
    const model = await TrainingPlanModel.query()
      .where('userId', userId)
      .whereIn('status', ['active', 'draft'])
      .orderBy('created_at', 'desc')
      .first()
    return model ? this.#toEntity(model) : null
  }

  async findActiveByGoalId(goalId: number): Promise<TrainingPlan | null> {
    const model = await TrainingPlanModel.query()
      .where('goalId', goalId)
      .whereIn('status', ['active', 'draft'])
      .orderBy('created_at', 'desc')
      .first()
    return model ? this.#toEntity(model) : null
  }

  async update(
    id: number,
    data: Partial<Omit<TrainingPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TrainingPlan> {
    const model = await TrainingPlanModel.findOrFail(id)
    if (data.goalId !== undefined) model.goalId = data.goalId
    if (data.methodology !== undefined) model.methodology = data.methodology
    if (data.level !== undefined) model.level = data.level
    if (data.status !== undefined) model.status = data.status
    if (data.autoRecalibrate !== undefined) model.autoRecalibrate = data.autoRecalibrate
    if (data.currentVdot !== undefined) model.currentVdot = data.currentVdot
    if (data.sessionsPerWeek !== undefined) model.sessionsPerWeek = data.sessionsPerWeek
    if (data.preferredDays !== undefined) model.preferredDays = data.preferredDays
    if (data.startDate !== undefined) model.startDate = DateTime.fromISO(data.startDate)
    if (data.endDate !== undefined) model.endDate = DateTime.fromISO(data.endDate)
    if (data.lastRecalibratedAt !== undefined)
      model.lastRecalibratedAt = data.lastRecalibratedAt
        ? DateTime.fromISO(data.lastRecalibratedAt)
        : null
    if (data.pendingVdotDown !== undefined) model.pendingVdotDown = data.pendingVdotDown ?? null
    await model.save()
    return this.#toEntity(model)
  }

  async delete(id: number): Promise<void> {
    await TrainingPlanModel.query().where('id', id).delete()
  }

  async createWeek(
    data: Omit<PlannedWeek, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PlannedWeek> {
    const model = await PlannedWeekModel.create(data)
    return this.#weekToEntity(model)
  }

  async findWeeksByPlanId(planId: number): Promise<PlannedWeek[]> {
    const models = await PlannedWeekModel.query()
      .where('planId', planId)
      .orderBy('week_number', 'asc')
    return models.map((m) => this.#weekToEntity(m))
  }

  async createSession(
    data: Omit<PlannedSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PlannedSession> {
    const model = await PlannedSessionModel.create(data)
    return this.#sessionToEntity(model)
  }

  async findSessionById(id: number): Promise<PlannedSession | null> {
    const model = await PlannedSessionModel.find(id)
    return model ? this.#sessionToEntity(model) : null
  }

  async findSessionsByPlanId(planId: number): Promise<PlannedSession[]> {
    const models = await PlannedSessionModel.query()
      .where('planId', planId)
      .orderBy('week_number', 'asc')
      .orderBy('day_of_week', 'asc')
    return models.map((m) => this.#sessionToEntity(m))
  }

  async updateSession(
    id: number,
    data: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PlannedSession> {
    const model = await PlannedSessionModel.findOrFail(id)
    Object.assign(model, data)
    await model.save()
    return this.#sessionToEntity(model)
  }

  async deleteSessionsFromWeek(planId: number, fromWeekNumber: number): Promise<void> {
    await PlannedSessionModel.query()
      .where('planId', planId)
      .where('week_number', '>=', fromWeekNumber)
      .delete()
  }

  async updateWeekByNumber(
    planId: number,
    weekNumber: number,
    data: Partial<Pick<PlannedWeek, 'isRecoveryWeek' | 'targetVolumeMinutes'>>
  ): Promise<void> {
    const model = await PlannedWeekModel.query()
      .where('planId', planId)
      .where('weekNumber', weekNumber)
      .firstOrFail()
    if (data.isRecoveryWeek !== undefined) model.isRecoveryWeek = data.isRecoveryWeek
    if (data.targetVolumeMinutes !== undefined) model.targetVolumeMinutes = data.targetVolumeMinutes
    await model.save()
  }

  async createPlanGraph(
    planData: Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>,
    weeks: PlanGraphWeek[]
  ): Promise<PlanGraph> {
    return db.transaction(async (trx) => {
      const planModel = await TrainingPlanModel.create(
        {
          userId: planData.userId,
          goalId: planData.goalId ?? null,
          methodology: planData.methodology,
          level: planData.level,
          status: planData.status,
          autoRecalibrate: planData.autoRecalibrate,
          vdotAtCreation: planData.vdotAtCreation,
          currentVdot: planData.currentVdot,
          sessionsPerWeek: planData.sessionsPerWeek,
          preferredDays: planData.preferredDays,
          startDate: DateTime.fromISO(planData.startDate),
          endDate: DateTime.fromISO(planData.endDate),
          lastRecalibratedAt: planData.lastRecalibratedAt
            ? DateTime.fromISO(planData.lastRecalibratedAt)
            : null,
        },
        { client: trx }
      )

      const weekModels = await PlannedWeekModel.createMany(
        weeks.map(({ week }) => ({ ...week, planId: planModel.id })),
        { client: trx }
      )

      const sessionModels = await PlannedSessionModel.createMany(
        weeks.flatMap(({ sessions }) =>
          sessions.map((session) => ({ ...session, planId: planModel.id }))
        ),
        { client: trx }
      )

      return {
        plan: this.#toEntity(planModel),
        weeks: weekModels.map((m) => this.#weekToEntity(m)),
        sessions: sessionModels.map((m) => this.#sessionToEntity(m)),
      }
    })
  }

  async replaceFromWeek(
    planId: number,
    fromWeekNumber: number,
    weeks: WeekReplacement[]
  ): Promise<void> {
    await db.transaction(async (trx) => {
      await PlannedSessionModel.query({ client: trx })
        .where('planId', planId)
        .where('week_number', '>=', fromWeekNumber)
        .delete()

      for (const week of weeks) {
        const weekModel = await PlannedWeekModel.query({ client: trx })
          .where('planId', planId)
          .where('weekNumber', week.weekNumber)
          .firstOrFail()
        weekModel.isRecoveryWeek = week.isRecoveryWeek
        weekModel.targetVolumeMinutes = week.targetVolumeMinutes
        weekModel.useTransaction(trx)
        await weekModel.save()
      }

      await PlannedSessionModel.createMany(
        weeks.flatMap((week) => week.sessions.map((session) => ({ ...session, planId }))),
        { client: trx }
      )
    })
  }

  #toEntity(model: TrainingPlanModel): TrainingPlan {
    return {
      id: model.id,
      userId: model.userId,
      goalId: model.goalId,
      methodology: model.methodology,
      level: model.level,
      status: model.status,
      autoRecalibrate: model.autoRecalibrate,
      vdotAtCreation: model.vdotAtCreation,
      currentVdot: model.currentVdot,
      sessionsPerWeek: model.sessionsPerWeek,
      preferredDays: model.preferredDays,
      startDate: model.startDate.toISODate() ?? '',
      endDate: model.endDate.toISODate() ?? '',
      lastRecalibratedAt: model.lastRecalibratedAt?.toISO() ?? null,
      pendingVdotDown: model.pendingVdotDown,
      createdAt: model.createdAt.toISO() ?? '',
      updatedAt: model.updatedAt.toISO() ?? '',
    }
  }

  #weekToEntity(model: PlannedWeekModel): PlannedWeek {
    return {
      id: model.id,
      planId: model.planId,
      weekNumber: model.weekNumber,
      phaseName: model.phaseName,
      phaseLabel: model.phaseLabel,
      isRecoveryWeek: model.isRecoveryWeek,
      targetVolumeMinutes: model.targetVolumeMinutes,
      createdAt: model.createdAt.toISO() ?? '',
      updatedAt: model.updatedAt.toISO() ?? '',
    }
  }

  #sessionToEntity(model: PlannedSessionModel): PlannedSession {
    return {
      id: model.id,
      planId: model.planId,
      weekNumber: model.weekNumber,
      dayOfWeek: model.dayOfWeek,
      sessionType: model.sessionType,
      targetDurationMinutes: model.targetDurationMinutes,
      targetDistanceKm: model.targetDistanceKm,
      targetPacePerKm: model.targetPacePerKm,
      intensityZone: model.intensityZone,
      intervals: model.intervals,
      targetLoadTss: model.targetLoadTss,
      completedSessionId: model.completedSessionId,
      status: model.status,
      createdAt: model.createdAt.toISO() ?? '',
      updatedAt: model.updatedAt.toISO() ?? '',
    }
  }
}
