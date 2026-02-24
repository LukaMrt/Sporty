import { test } from '@japa/runner'
import CreateUser from '#use_cases/admin/create_user'
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
    async update(_id: number, _data: Partial<Omit<User, 'id'>>): Promise<User> {
      throw new Error('Not implemented')
    }
    async delete(): Promise<void> {}
    async verifyPassword(): Promise<boolean> {
      return false
    }
  }
  return Object.assign(new MockRepository(), overrides)
}

test.group('CreateUser — use case', () => {
  test('crée un utilisateur avec le rôle fourni et onboardingCompleted false', async ({
    assert,
  }) => {
    let capturedData: Omit<User, 'id'> | null = null
    const repo = makeUserRepository({
      create: async (data) => {
        capturedData = data
        return { id: 42, ...data }
      },
    })

    const useCase = new CreateUser(repo)
    const result = await useCase.execute({
      fullName: 'Bob Martin',
      email: 'bob@example.com',
      password: 'motdepasse123',
      role: 'user',
    })

    assert.equal(result.id, 42)
    assert.equal(result.fullName, 'Bob Martin')
    assert.equal(result.email, 'bob@example.com')
    assert.equal(result.role, 'user')
    assert.isFalse(result.onboardingCompleted)
    assert.isNotNull(capturedData)
    assert.equal(capturedData!.role, 'user')
    assert.isFalse(capturedData!.onboardingCompleted)
  })

  test('crée un utilisateur avec le rôle admin si spécifié', async ({ assert }) => {
    let capturedRole = ''
    const repo = makeUserRepository({
      create: async (data) => {
        capturedRole = data.role
        return { id: 1, ...data }
      },
    })

    const useCase = new CreateUser(repo)
    await useCase.execute({
      fullName: 'Alice Admin',
      email: 'alice@example.com',
      password: 'motdepasse123',
      role: 'admin',
    })

    assert.equal(capturedRole, 'admin')
  })

  test('transmet le mot de passe tel quel au repository (le hash est géré par le modèle)', async ({
    assert,
  }) => {
    let capturedPassword = ''
    const repo = makeUserRepository({
      create: async (data) => {
        capturedPassword = data.password
        return { id: 1, ...data }
      },
    })

    const useCase = new CreateUser(repo)
    await useCase.execute({
      fullName: 'Alice',
      email: 'alice@example.com',
      password: 'plaintext',
      role: 'user',
    })

    assert.equal(capturedPassword, 'plaintext')
  })
})
