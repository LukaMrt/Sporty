import { test } from '@japa/runner'
import LoginUser from '#use_cases/auth/login_user'
import { AuthService } from '#domain/interfaces/auth_service'
import { UserRepository } from '#domain/interfaces/user_repository'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'
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

function makeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  class MockUserRepository extends UserRepository {
    async countAll(): Promise<number> {
      return 0
    }
    async create(_user: Omit<User, 'id'>): Promise<User> {
      throw new Error('Not implemented')
    }
    async findByEmail(_email: string): Promise<User | null> {
      return null
    }
    async findAll(): Promise<User[]> {
      return []
    }
    async findById(): Promise<null> {
      return null
    }
    async update(_id: number, _data: Partial<Omit<User, 'id'>>): Promise<User> {
      throw new Error('Not implemented')
    }
    async delete(): Promise<void> {}
  }
  return Object.assign(new MockUserRepository(), overrides)
}

test.group('LoginUser — use case', () => {
  test("credentials valides → session créée (pas d'erreur)", async ({ assert }) => {
    let attemptCalled = false
    const authService = makeAuthService({
      attempt: async () => {
        attemptCalled = true
      },
    })
    const useCase = new LoginUser(authService, makeUserRepository())

    await useCase.execute('user@example.com', 'validpassword')

    assert.isTrue(attemptCalled)
  })

  test('credentials invalides → lance InvalidCredentialsError', async ({ assert }) => {
    const authService = makeAuthService({
      attempt: async () => {
        throw new InvalidCredentialsError()
      },
    })
    const useCase = new LoginUser(authService, makeUserRepository())

    let thrownError: unknown
    try {
      await useCase.execute('user@example.com', 'wrongpassword')
    } catch (e) {
      thrownError = e
    }

    assert.instanceOf(thrownError, InvalidCredentialsError)
  })

  test("ensureUsersExist — des users existent → pas d'erreur", async () => {
    const userRepository = makeUserRepository({ countAll: async () => 1 })
    const useCase = new LoginUser(makeAuthService(), userRepository)

    await useCase.ensureUsersExist()
  })

  test('ensureUsersExist — aucun user → lance NoRegisteredUserError', async ({ assert }) => {
    const userRepository = makeUserRepository({ countAll: async () => 0 })
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
