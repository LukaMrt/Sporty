import { UserRepository } from '#domain/interfaces/user_repository'
import type { User } from '#domain/entities/user'

export function makeMockUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  class MockRepository extends UserRepository {
    async countAll(): Promise<number> {
      return 0
    }
    async create(data: Omit<User, 'id'>): Promise<User> {
      return { id: 1, ...data }
    }
    async findByEmail(): Promise<null> {
      return null
    }
    async findAll(): Promise<User[]> {
      return []
    }
    async findById(): Promise<null> {
      return null
    }
    async update(): Promise<User> {
      return {
        id: 1,
        fullName: '',
        email: '',
        password: '',
        role: 'user',
        onboardingCompleted: false,
        createdAt: '',
      }
    }
    async delete(): Promise<void> {}
    async verifyPassword(): Promise<boolean> {
      return false
    }
    async markOnboardingCompleted(): Promise<void> {}
  }
  return Object.assign(new MockRepository(), overrides)
}
