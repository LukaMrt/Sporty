import { test } from '@japa/runner'
import ListUsers from '#use_cases/admin/list_users'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import type { User } from '#domain/entities/user'

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

    const repo = makeMockUserRepository({ findAll: async () => users })
    const useCase = new ListUsers(repo)

    const result = await useCase.listAllUsers()

    assert.deepEqual(result, users)
  })

  test('retourne un tableau vide si aucun utilisateur', async ({ assert }) => {
    const repo = makeMockUserRepository({ findAll: async () => [] })
    const useCase = new ListUsers(repo)

    const result = await useCase.listAllUsers()

    assert.deepEqual(result, [])
  })
})
