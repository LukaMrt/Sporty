import { test } from '@japa/runner'
import RegisterUser from '#use_cases/auth/register_user'
import { UserAlreadyExistsError } from '#domain/errors/user_already_exists_error'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import { AuthService } from '#domain/interfaces/auth_service'
import type { User } from '#domain/entities/user'

function makeAuthService(): AuthService {
  class MockAuthService extends AuthService {
    async login(_user: User): Promise<void> {}
    async attempt(_email: string, _password: string): Promise<void> {}
    async logout(): Promise<void> {}
    async isAuthenticated(): Promise<boolean> {
      return false
    }
  }
  return new MockAuthService()
}

test.group('RegisterUser — use case', () => {
  test('premier utilisateur → rôle admin créé', async ({ assert }) => {
    const repo = makeMockUserRepository()
    const useCase = new RegisterUser(repo, makeAuthService())

    const user = await useCase.registerUser({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
    })

    assert.equal(user.role, 'admin')
  })

  test('utilisateur déjà existant → lance UserAlreadyExistsError', async ({ assert }) => {
    const repo = makeMockUserRepository({ countAll: async () => 1 })
    const useCase = new RegisterUser(repo, makeAuthService())

    let thrownError: unknown
    try {
      await useCase.registerUser({
        fullName: 'Test',
        email: 'test@example.com',
        password: 'password123',
      })
    } catch (e) {
      thrownError = e
    }

    assert.instanceOf(thrownError, UserAlreadyExistsError)
  })

  test('mot de passe transmis tel quel au repository (hashé par le mixin withAuthFinder)', async ({
    assert,
  }) => {
    const captured: Omit<User, 'id'>[] = []
    const repo = makeMockUserRepository({
      create: async (data) => {
        captured.push(data)
        return { id: 1, ...data }
      },
    })
    const useCase = new RegisterUser(repo, makeAuthService())

    await useCase.registerUser({
      fullName: 'Test',
      email: 'test@example.com',
      password: 'plaintext_password',
    })

    assert.equal(captured[0].password, 'plaintext_password')
  })
})
