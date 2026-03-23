import { DateTime } from 'luxon'
import type { TrainingGoal } from '#domain/entities/training_goal'
import { TrainingGoalRepository } from '#domain/interfaces/training_goal_repository'
import TrainingGoalModel from '#models/training_goal'

export default class LucidTrainingGoalRepository extends TrainingGoalRepository {
  async create(data: Omit<TrainingGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingGoal> {
    const model = await TrainingGoalModel.create({
      userId: data.userId,
      targetDistanceKm: data.targetDistanceKm,
      targetTimeMinutes: data.targetTimeMinutes ?? null,
      eventDate: data.eventDate ? DateTime.fromISO(data.eventDate) : null,
      status: data.status,
    })
    return this.#toEntity(model)
  }

  async findById(id: number): Promise<TrainingGoal | null> {
    const model = await TrainingGoalModel.find(id)
    return model ? this.#toEntity(model) : null
  }

  async findByUserId(userId: number): Promise<TrainingGoal[]> {
    const models = await TrainingGoalModel.query()
      .where('userId', userId)
      .orderBy('created_at', 'desc')
    return models.map((m) => this.#toEntity(m))
  }

  async update(
    id: number,
    data: Partial<Omit<TrainingGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TrainingGoal> {
    const model = await TrainingGoalModel.findOrFail(id)
    if (data.targetDistanceKm !== undefined) model.targetDistanceKm = data.targetDistanceKm
    if (data.targetTimeMinutes !== undefined) model.targetTimeMinutes = data.targetTimeMinutes
    if (data.eventDate !== undefined)
      model.eventDate = data.eventDate ? DateTime.fromISO(data.eventDate) : null
    if (data.status !== undefined) model.status = data.status
    await model.save()
    return this.#toEntity(model)
  }

  async delete(id: number): Promise<void> {
    await TrainingGoalModel.query().where('id', id).delete()
  }

  #toEntity(model: TrainingGoalModel): TrainingGoal {
    return {
      id: model.id,
      userId: model.userId,
      targetDistanceKm: model.targetDistanceKm,
      targetTimeMinutes: model.targetTimeMinutes,
      eventDate: model.eventDate?.toISODate() ?? null,
      status: model.status,
      createdAt: model.createdAt.toISO() ?? '',
      updatedAt: model.updatedAt.toISO() ?? '',
    }
  }
}
