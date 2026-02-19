import { test } from '@japa/runner'
import ListUsers from '#use_cases/admin/list_users'
import { UserRepository } from '#domain/interfaces/user_repository'
import type { User } from '#domain/entities/user'

function makeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  class MockRepository extends UserRepository {
    async countAll() {
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
  }
  return Object.assign(new MockRepository(), overrides)
}

test.group('ListUsers — use case', () => {
  test('retourne la liste des utilisateurs fournie par le repository', async ({ assert }) => {
    const users: User[] = [
      {
        id: 1,
        fullName: 'Alice Admin',
        email: 'alice@example.com',
        password: 'hashed',
        role: 'admin',
        onboardingCompleted: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        fullName: 'Bob User',
        email: 'bob@example.com',
        password: 'hashed',
        role: 'user',
        onboardingCompleted: false,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ]

    const repo = makeUserRepository({ findAll: async () => users })
    const useCase = new ListUsers(repo)

    const result = await useCase.listAllUsers()

    assert.deepEqual(result, users)
  })

  test('retourne un tableau vide si aucun utilisateur', async ({ assert }) => {
    const repo = makeUserRepository({ findAll: async () => [] })
    const useCase = new ListUsers(repo)

    const result = await useCase.listAllUsers()

    assert.deepEqual(result, [])
  })
})
