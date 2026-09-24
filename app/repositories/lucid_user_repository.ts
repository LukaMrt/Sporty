import type { NewUser, User, UserUpdate } from '#domain/entities/user'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'
import UserModel from '#models/user'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'

/** Clé arbitraire du verrou consultatif PostgreSQL qui sérialise la création du premier compte */
const FIRST_USER_LOCK_KEY = 7_331_001

export default class LucidUserRepository extends UserRepository {
  async countAll(): Promise<number> {
    const result = await UserModel.query().count('* as total')
    return Number(result[0].$extras.total)
  }

  async countByRole(role: User['role']): Promise<number> {
    const result = await UserModel.query().where('role', role).count('* as total')
    return Number(result[0].$extras.total)
  }

  async create(user: NewUser): Promise<User> {
    const model = await UserModel.create({
      fullName: user.fullName,
      email: user.email,
      password: user.password,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
    })
    return this.#toEntity(model)
  }

  async createFirstUser(user: NewUser): Promise<User | null> {
    return db.transaction(async (trx) => {
      // Verrou relâché automatiquement au commit/rollback : deux inscriptions
      // simultanées ne peuvent plus créer chacune un admin.
      await trx.rawQuery('SELECT pg_advisory_xact_lock(?)', [FIRST_USER_LOCK_KEY])
      const existing = await UserModel.query({ client: trx }).count('* as total')
      if (Number(existing[0].$extras.total) > 0) return null
      const model = await UserModel.create(
        {
          fullName: user.fullName,
          email: user.email,
          password: user.password,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
        },
        { client: trx }
      )
      return this.#toEntity(model)
    })
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

  async update(id: number, data: UserUpdate): Promise<User> {
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

  async markOnboardingCompleted(userId: number): Promise<void> {
    const model = await UserModel.find(userId)
    if (!model) throw new UserNotFoundError(userId)
    model.onboardingCompleted = true
    await model.save()
  }

  #toEntity(model: UserModel): User {
    return {
      id: model.id,
      email: model.email,
      fullName: model.fullName,
      role: model.role,
      onboardingCompleted: model.onboardingCompleted,
      createdAt: model.createdAt.toISO() ?? '',
    }
  }
}
