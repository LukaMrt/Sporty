import { test } from '@japa/runner'
import ChangePassword from '#use_cases/profile/change_password'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
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
  }
  return Object.assign(new MockRepository(), overrides)
}

test.group('ChangePassword — use case', () => {
  test('change le mot de passe quand ancien mdp correct', async ({ assert }) => {
    let updatedData: { id: number; password?: string } = { id: 0 }
    const repo = makeUserRepository({
      verifyPassword: async () => true,
      update: async (id, data) => {
        updatedData = { id, password: data.password }
        return {
          id,
          fullName: '',
          email: '',
          password: data.password ?? '',
          role: 'user',
          onboardingCompleted: false,
          createdAt: '',
        }
      },
    })

    const useCase = new ChangePassword(repo)
    await useCase.execute(42, 'oldpass', 'newpass123')

    assert.equal(updatedData.id, 42)
    assert.equal(updatedData.password, 'newpass123')
  })

  test('lève InvalidCredentialsError quand ancien mdp incorrect', async ({ assert }) => {
    const repo = makeUserRepository({
      verifyPassword: async () => false,
    })

    const useCase = new ChangePassword(repo)

    try {
      await useCase.execute(42, 'wrongpass', 'newpass123')
      assert.fail('Devrait lever une erreur')
    } catch (error) {
      assert.instanceOf(error, InvalidCredentialsError)
    }
  })

  test("n'appelle pas update quand ancien mdp incorrect", async ({ assert }) => {
    let updateCalled = false
    const repo = makeUserRepository({
      verifyPassword: async () => false,
      update: async () => {
        updateCalled = true
        return {
          id: 1,
          fullName: '',
          email: '',
          password: '',
          role: 'user',
          onboardingCompleted: false,
          createdAt: '',
        }
      },
    })

    const useCase = new ChangePassword(repo)

    try {
      await useCase.execute(42, 'wrongpass', 'newpass123')
    } catch {
      // attendu
    }

    assert.isFalse(updateCalled)
  })
})
