import { DateTime } from 'luxon'
import type { TrainingSession } from '#domain/entities/training_session'
import type { PaginatedResult } from '#domain/entities/pagination'
import { SessionRepository } from '#domain/interfaces/session_repository'
import type { ListSessionsOptions } from '#domain/interfaces/session_repository'
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
    opts?: ListSessionsOptions
  ): Promise<PaginatedResult<TrainingSession>> {
    const page = opts?.page ?? 1
    const perPage = opts?.perPage ?? 20
    const sortBy = opts?.sortBy ?? 'date'
    const sortOrder = opts?.sortOrder ?? 'desc'
    const query = SessionModel.query()
      .preload('sport')
      .withScopes((s) => s.withoutTrashed())
      .where('userId', userId)
      .if(opts?.sportId !== undefined, (q) => q.where('sportId', opts!.sportId!))

    const sorted =
      sortBy === 'distance_km'
        ? query.orderByRaw(
            `distance_km IS NULL, distance_km ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`
          )
        : query.orderBy(sortBy, sortOrder)
    const result = await sorted.paginate(page, perPage)
    return {
      data: result.all().map((m) => this.#toEntity(m)),
      meta: {
        total: result.total,
        page: result.currentPage,
        perPage: result.perPage,
        lastPage: result.lastPage,
      },
    }
  }

  async findById(id: number): Promise<TrainingSession | null> {
    const model = await SessionModel.query()
      .preload('sport')
      .withScopes((s) => s.withoutTrashed())
      .where('id', id)
      .first()
    return model ? this.#toEntity(model) : null
  }

  async findByIdIncludingTrashed(id: number): Promise<TrainingSession | null> {
    const model = await SessionModel.query().preload('sport').where('id', id).first()
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

  async findTrashedByUserId(userId: number): Promise<TrainingSession[]> {
    const models = await SessionModel.query()
      .preload('sport')
      .withScopes((s) => s.onlyTrashed())
      .where('userId', userId)
      .orderBy('deletedAt', 'desc')
    return models.map((m) => this.#toEntity(m))
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

  async findByUserIdAndDateRange(
    userId: number,
    startDate: string,
    endDate: string
  ): Promise<TrainingSession[]> {
    const models = await SessionModel.query()
      .where('userId', userId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .withScopes((s) => s.withoutTrashed())
      .preload('sport')
      .orderBy('date', 'asc')
    return models.map((m) => this.#toEntity(m))
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
      deletedAt: model.deletedAt?.toISO() ?? null,
    }
  }
}
