import { test } from '@japa/runner'
import RegisterUser from '#use_cases/auth/register_user'
import { UserAlreadyExistsError } from '#domain/errors/user_already_exists_error'
import { UserRepository } from '#domain/interfaces/user_repository'
import { AuthService } from '#domain/interfaces/auth_service'
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
  }
  return Object.assign(new MockRepository(), overrides)
}

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
    const repo = makeUserRepository()
    const useCase = new RegisterUser(repo, makeAuthService())

    const user = await useCase.registerUser({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
    })

    assert.equal(user.role, 'admin')
  })

  test('utilisateur déjà existant → lance UserAlreadyExistsError', async ({ assert }) => {
    const repo = makeUserRepository({ countAll: async () => 1 })
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

  test('mot de passe transmis tel quel au repository (hashé par @beforeSave du modèle)', async ({
    assert,
  }) => {
    const captured: Omit<User, 'id'>[] = []
    const repo = makeUserRepository({
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
