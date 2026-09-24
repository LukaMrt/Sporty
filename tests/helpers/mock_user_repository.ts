import { UserRepository } from '#domain/interfaces/user_repository'
import type { NewUser, User } from '#domain/entities/user'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    fullName: '',
    email: '',
    role: 'user',
    onboardingCompleted: false,
    createdAt: '',
    ...overrides,
  }
}

function toUser(data: NewUser): User {
  return {
    id: 1,
    createdAt: '',
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    onboardingCompleted: data.onboardingCompleted,
  }
}

export function makeMockUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  class MockRepository extends UserRepository {
    async countAll(): Promise<number> {
      return 0
    }
    async countByRole(): Promise<number> {
      return 0
    }
    async create(data: NewUser): Promise<User> {
      return toUser(data)
    }
    async createFirstUser(data: NewUser): Promise<User | null> {
      return toUser(data)
    }
    async findByEmail(): Promise<null> {
      return null
    }
    async findAll(): Promise<User[]> {
      return []
    }
    async findById(): Promise<User | null> {
      return null
    }
    async update(): Promise<User> {
      return makeUser()
    }
    async delete(): Promise<void> {}
    async verifyPassword(): Promise<boolean> {
      return false
    }
    async markOnboardingCompleted(): Promise<void> {}
  }
  return Object.assign(new MockRepository(), overrides)
}
