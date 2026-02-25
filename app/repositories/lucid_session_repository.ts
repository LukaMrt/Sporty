import { DateTime } from 'luxon'
import type { TrainingSession } from '#domain/entities/training_session'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import SessionModel from '#models/session'

export default class LucidSessionRepository extends SessionRepository {
  async create(
    data: Omit<TrainingSession, 'id' | 'createdAt' | 'sportName'>
  ): Promise<TrainingSession> {
    const model = await SessionModel.create({
      userId: data.userId,
      sportId: data.sportId,
      date: DateTime.fromISO(data.date),
      durationMinutes: data.durationMinutes,
      distanceKm: data.distanceKm ?? null,
      avgHeartRate: data.avgHeartRate ?? null,
      perceivedEffort: data.perceivedEffort ?? null,
      sportMetrics: data.sportMetrics,
      notes: data.notes ?? null,
    })
    await model.load('sport')
    return this.#toEntity(model)
  }

  async findAllByUserId(
    userId: number,
    opts?: { limit?: number; offset?: number }
  ): Promise<TrainingSession[]> {
    let query = SessionModel.query()
      .preload('sport')
      .withScopes((s) => s.withoutTrashed())
      .where('userId', userId)
      .orderBy('date', 'desc')

    if (opts?.limit !== undefined) query = query.limit(opts.limit)
    if (opts?.offset !== undefined) query = query.offset(opts.offset)

    const models = await query
    return models.map((m) => this.#toEntity(m))
  }

  async findById(id: number): Promise<TrainingSession | null> {
    const model = await SessionModel.query()
      .preload('sport')
      .withScopes((s) => s.withoutTrashed())
      .where('id', id)
      .first()
    return model ? this.#toEntity(model) : null
  }

  async update(
    id: number,
    data: Partial<Omit<TrainingSession, 'id' | 'userId' | 'createdAt' | 'sportName'>>
  ): Promise<TrainingSession> {
    const model = await SessionModel.find(id)
    if (!model) throw new SessionNotFoundError(id)

    if (data.sportId !== undefined) model.sportId = data.sportId
    if (data.date !== undefined) model.date = DateTime.fromISO(data.date)
    if (data.durationMinutes !== undefined) model.durationMinutes = data.durationMinutes
    if (data.distanceKm !== undefined) model.distanceKm = data.distanceKm
    if (data.avgHeartRate !== undefined) model.avgHeartRate = data.avgHeartRate
    if (data.perceivedEffort !== undefined) model.perceivedEffort = data.perceivedEffort
    if (data.sportMetrics !== undefined) model.sportMetrics = data.sportMetrics
    if (data.notes !== undefined) model.notes = data.notes

    await model.save()
    await model.load('sport')
    return this.#toEntity(model)
  }

  async softDelete(id: number): Promise<void> {
    const model = await SessionModel.find(id)
    if (!model) throw new SessionNotFoundError(id)
    model.deletedAt = DateTime.now()
    await model.save()
  }

  async restore(id: number): Promise<void> {
    const model = await SessionModel.query()
      .withScopes((s) => s.onlyTrashed())
      .where('id', id)
      .first()
    if (!model) throw new SessionNotFoundError(id)
    model.deletedAt = null
    await model.save()
  }

  #toEntity(model: SessionModel): TrainingSession {
    return {
      id: model.id,
      userId: model.userId,
      sportId: model.sportId,
      sportName: model.sport.name,
      date: model.date.toISODate() ?? '',
      durationMinutes: model.durationMinutes,
      distanceKm: model.distanceKm,
      avgHeartRate: model.avgHeartRate,
      perceivedEffort: model.perceivedEffort,
      sportMetrics: model.sportMetrics,
      notes: model.notes,
      createdAt: model.createdAt.toISO() ?? '',
    }
  }
}
