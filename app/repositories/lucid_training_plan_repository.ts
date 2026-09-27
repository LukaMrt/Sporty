import { DateTime } from 'luxon'
import type { NewTrainingPlan, TrainingPlan } from '#domain/entities/training_plan'
import type { NewPlannedWeek, PlannedWeek } from '#domain/entities/planned_week'
import {
  SESSION_EXTRAS_DEFAULTS,
  type NewPlannedSession,
  type PlannedSession,
} from '#domain/entities/planned_session'
import { PlanSource } from '#domain/value_objects/planning_types'
import { TrainingPlanRepository } from '#domain/interfaces/training_plan_repository'
import TrainingPlanModel from '#models/training_plan'
import PlannedWeekModel from '#models/planned_week'
import PlannedSessionModel from '#models/planned_session'
import { txOptions } from '#repositories/transaction_context'

export default class LucidTrainingPlanRepository extends TrainingPlanRepository {
  async create(data: NewTrainingPlan): Promise<TrainingPlan> {
    const model = await TrainingPlanModel.create(
      {
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
        source: data.source ?? PlanSource.Generated,
        name: data.name ?? null,
        notes: data.notes ?? null,
      },
      txOptions()
    )
    return this.#toEntity(model)
  }

  async findById(id: number): Promise<TrainingPlan | null> {
    const model = await TrainingPlanModel.find(id, txOptions())
    return model ? this.#toEntity(model) : null
  }

  async findByUserId(userId: number): Promise<TrainingPlan[]> {
    const models = await TrainingPlanModel.query(txOptions())
      .where('userId', userId)
      .orderBy('created_at', 'desc')
    return models.map((m) => this.#toEntity(m))
  }

  async findActiveByUserId(userId: number): Promise<TrainingPlan | null> {
    const model = await TrainingPlanModel.query(txOptions())
      .where('userId', userId)
      .whereIn('status', ['active', 'draft'])
      // Déterministe même si l'invariant (index unique partiel) était violé
      .orderBy('id', 'desc')
      .first()
    return model ? this.#toEntity(model) : null
  }

  async lockActiveByUserId(userId: number): Promise<TrainingPlan | null> {
    const model = await TrainingPlanModel.query(txOptions())
      .where('userId', userId)
      .whereIn('status', ['active', 'draft'])
      .orderBy('id', 'desc')
      .forUpdate()
      .first()
    return model ? this.#toEntity(model) : null
  }

  async findAllActive(): Promise<TrainingPlan[]> {
    const models = await TrainingPlanModel.query(txOptions()).where('status', 'active')
    return models.map((m) => this.#toEntity(m))
  }

  async findActiveByGoalId(goalId: number): Promise<TrainingPlan | null> {
    const model = await TrainingPlanModel.query(txOptions())
      .where('goalId', goalId)
      .whereIn('status', ['active', 'draft'])
      .first()
    return model ? this.#toEntity(model) : null
  }

  async update(
    id: number,
    data: Partial<Omit<TrainingPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TrainingPlan> {
    const model = await TrainingPlanModel.findOrFail(id, txOptions())
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
    if (data.source !== undefined) model.source = data.source
    if (data.name !== undefined) model.name = data.name
    if (data.notes !== undefined) model.notes = data.notes
    await model.save()
    return this.#toEntity(model)
  }

  async delete(id: number): Promise<void> {
    await TrainingPlanModel.query(txOptions()).where('id', id).delete()
  }

  async createWeek(data: NewPlannedWeek): Promise<PlannedWeek> {
    const model = await PlannedWeekModel.create({ notes: null, ...data }, txOptions())
    return this.#weekToEntity(model)
  }

  async createWeeks(data: NewPlannedWeek[]): Promise<PlannedWeek[]> {
    if (data.length === 0) return []
    const models = await PlannedWeekModel.createMany(
      data.map((week) => ({ notes: null, ...week })),
      txOptions()
    )
    return models.map((m) => this.#weekToEntity(m))
  }

  async findWeeksByPlanId(planId: number): Promise<PlannedWeek[]> {
    const models = await PlannedWeekModel.query(txOptions())
      .where('planId', planId)
      .orderBy('week_number', 'asc')
    return models.map((m) => this.#weekToEntity(m))
  }

  async createSession(data: NewPlannedSession): Promise<PlannedSession> {
    const model = await PlannedSessionModel.create(
      { ...SESSION_EXTRAS_DEFAULTS, ...data },
      txOptions()
    )
    return this.#sessionToEntity(model)
  }

  async createSessions(data: NewPlannedSession[]): Promise<PlannedSession[]> {
    if (data.length === 0) return []
    const models = await PlannedSessionModel.createMany(
      data.map((session) => ({ ...SESSION_EXTRAS_DEFAULTS, ...session })),
      txOptions()
    )
    return models.map((m) => this.#sessionToEntity(m))
  }

  async findSessionById(id: number): Promise<PlannedSession | null> {
    const model = await PlannedSessionModel.find(id, txOptions())
    return model ? this.#sessionToEntity(model) : null
  }

  async findSessionsByPlanId(planId: number): Promise<PlannedSession[]> {
    const models = await PlannedSessionModel.query(txOptions())
      .where('planId', planId)
      .orderBy('week_number', 'asc')
      .orderBy('day_of_week', 'asc')
      .orderBy('order_in_day', 'asc')
    return models.map((m) => this.#sessionToEntity(m))
  }

  async updateSession(
    id: number,
    data: Partial<Omit<PlannedSession, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PlannedSession> {
    const model = await PlannedSessionModel.findOrFail(id, txOptions())
    Object.assign(model, data)
    await model.save()
    return this.#sessionToEntity(model)
  }

  async deleteSession(id: number): Promise<void> {
    await PlannedSessionModel.query(txOptions()).where('id', id).delete()
  }

  async updateWeek(
    id: number,
    data: Partial<
      Pick<
        PlannedWeek,
        'phaseName' | 'phaseLabel' | 'isRecoveryWeek' | 'targetVolumeMinutes' | 'notes'
      >
    >
  ): Promise<PlannedWeek> {
    const model = await PlannedWeekModel.findOrFail(id, txOptions())
    Object.assign(model, data)
    await model.save()
    return this.#weekToEntity(model)
  }

  async deleteWeek(planId: number, weekNumber: number): Promise<void> {
    await PlannedSessionModel.query(txOptions())
      .where('planId', planId)
      .where('week_number', weekNumber)
      .delete()
    await PlannedWeekModel.query(txOptions())
      .where('planId', planId)
      .where('week_number', weekNumber)
      .delete()
    // Renumérotation dans l'ordre croissant : l'index unique (plan, semaine)
    // n'est jamais violé en cours de route
    const following = await PlannedWeekModel.query(txOptions())
      .where('planId', planId)
      .where('week_number', '>', weekNumber)
      .orderBy('week_number', 'asc')
    for (const week of following) {
      const previous = week.weekNumber
      await PlannedSessionModel.query(txOptions())
        .where('planId', planId)
        .where('week_number', previous)
        .update({ week_number: previous - 1 })
      week.weekNumber = previous - 1
      await week.save()
    }
  }

  async deleteSessionsFromWeek(planId: number, fromWeekNumber: number): Promise<void> {
    await PlannedSessionModel.query(txOptions())
      .where('planId', planId)
      .where('week_number', '>=', fromWeekNumber)
      .delete()
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
      source: model.source,
      name: model.name,
      notes: model.notes,
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
      notes: model.notes,
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
      sportSlug: model.sportSlug,
      title: model.title,
      description: model.description ?? '',
      targetDurationMinutes: model.targetDurationMinutes,
      targetDistanceKm: model.targetDistanceKm,
      targetPacePerKm: model.targetPacePerKm,
      targetPacePer100m: model.targetPacePer100m,
      targetPowerWatts: model.targetPowerWatts,
      targetRpe: model.targetRpe,
      exercises: model.exercises,
      orderInDay: model.orderInDay,
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
