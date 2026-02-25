import { test } from '@japa/runner'
import GetUser from '#use_cases/admin/get_user'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import type { User } from '#domain/entities/user'

const MOCK_USER: User = {
  id: 42,
  fullName: 'Alice',
  email: 'alice@example.com',
  password: 'hashed',
  role: 'user',
  onboardingCompleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

test.group('GetUser — use case', () => {
  test('retourne le user si trouvé', async ({ assert }) => {
    const repo = makeMockUserRepository({ findById: async () => MOCK_USER })
    const useCase = new GetUser(repo)

    const result = await useCase.execute(42)

    assert.deepEqual(result, MOCK_USER)
  })

  test('lève UserNotFoundError si le user est introuvable', async ({ assert }) => {
    const repo = makeMockUserRepository({ findById: async () => null })
    const useCase = new GetUser(repo)

    try {
      await useCase.execute(99)
      assert.fail('Devrait lever une erreur')
    } catch (error) {
      assert.instanceOf(error, UserNotFoundError)
    }
  })
})
