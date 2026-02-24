import type { User } from '#domain/entities/user'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'
import UserModel from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class LucidUserRepository extends UserRepository {
  async countAll(): Promise<number> {
    const result = await UserModel.query().count('* as total')
    return Number(result[0].$extras.total)
  }

  async create(user: Omit<User, 'id'>): Promise<User> {
    const model = await UserModel.create({
      fullName: user.fullName,
      email: user.email,
      password: user.password,
      role: user.role,
    })
    return this.#toEntity(model)
  }

  async findByEmail(email: string): Promise<User | null> {
    const model = await UserModel.findBy('email', email)
    return model ? this.#toEntity(model) : null
  }

  async findAll(): Promise<User[]> {
    const models = await UserModel.query().orderBy('created_at', 'asc')
    return models.map((model) => this.#toEntity(model))
  }

  async findById(id: number): Promise<User | null> {
    const model = await UserModel.find(id)
    return model ? this.#toEntity(model) : null
  }

  async update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User> {
    const model = await UserModel.find(id)
    if (!model) throw new UserNotFoundError(id)
    if (data.fullName !== undefined) model.fullName = data.fullName
    if (data.email !== undefined) model.email = data.email
    if (data.password !== undefined) model.password = data.password
    if (data.role !== undefined) model.role = data.role
    if (data.onboardingCompleted !== undefined) model.onboardingCompleted = data.onboardingCompleted
    await model.save()
    return this.#toEntity(model)
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const model = await UserModel.find(userId)
    if (!model) throw new UserNotFoundError(userId)
    return hash.verify(model.password, password)
  }

  async delete(id: number): Promise<void> {
    const model = await UserModel.find(id)
    if (!model) throw new UserNotFoundError(id)
    await model.delete()
  }

  #toEntity(model: UserModel): User {
    return {
      id: model.id,
      email: model.email,
      fullName: model.fullName,
      password: model.password,
      role: model.role,
      onboardingCompleted: model.onboardingCompleted,
      createdAt: model.createdAt.toISO() ?? '',
    }
  }
}
