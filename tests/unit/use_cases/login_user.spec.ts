import { test } from '@japa/runner'
import LoginUser from '#use_cases/auth/login_user'
import { AuthService } from '#domain/interfaces/auth_service'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import type { User } from '#domain/entities/user'

function makeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  class MockAuthService extends AuthService {
    async login(_user: User): Promise<void> {}
    async attempt(_email: string, _password: string): Promise<void> {}
    async logout(): Promise<void> {}
    async isAuthenticated(): Promise<boolean> {
      return false
    }
  }
  return Object.assign(new MockAuthService(), overrides)
}

test.group('LoginUser — use case', () => {
  test("credentials valides → session créée (pas d'erreur)", async ({ assert }) => {
    let attemptCalled = false
    const authService = makeAuthService({
      attempt: async () => {
        attemptCalled = true
      },
    })
    const useCase = new LoginUser(authService, makeMockUserRepository())

    await useCase.execute('user@example.com', 'validpassword')

    assert.isTrue(attemptCalled)
  })

  test('credentials invalides → lance InvalidCredentialsError', async ({ assert }) => {
    const authService = makeAuthService({
      attempt: async () => {
        throw new InvalidCredentialsError()
      },
    })
    const useCase = new LoginUser(authService, makeMockUserRepository())

    let thrownError: unknown
    try {
      await useCase.execute('user@example.com', 'wrongpassword')
    } catch (e) {
      thrownError = e
    }

    assert.instanceOf(thrownError, InvalidCredentialsError)
  })

  test("ensureUsersExist — des users existent → pas d'erreur", async () => {
    const userRepository = makeMockUserRepository({ countAll: async () => 1 })
    const useCase = new LoginUser(makeAuthService(), userRepository)

    await useCase.ensureUsersExist()
  })

  test('ensureUsersExist — aucun user → lance NoRegisteredUserError', async ({ assert }) => {
    const userRepository = makeMockUserRepository({ countAll: async () => 0 })
    const useCase = new LoginUser(makeAuthService(), userRepository)

    let thrownError: unknown
    try {
      await useCase.ensureUsersExist()
    } catch (e) {
      thrownError = e
    }

    assert.instanceOf(thrownError, NoRegisteredUserError)
  })
})
