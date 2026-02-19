import type { User } from '#domain/entities/user'
import { UserRepository } from '#domain/interfaces/user_repository'
import UserModel from '#models/user'

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
