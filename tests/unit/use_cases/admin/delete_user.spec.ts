import { test } from '@japa/runner'
import DeleteUser from '#use_cases/admin/delete_user'
import { CannotDeleteSelfError } from '#domain/errors/cannot_delete_self_error'
import { UserDomainService } from '#domain/services/user_domain_service'
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

test.group('UserDomainService.assertCanDelete', () => {
  test('ne lève pas si targetId !== requesterId', ({ assert }) => {
    assert.doesNotThrow(() => UserDomainService.assertCanDelete(10, 1))
  })

  test('lève CannotDeleteSelfError si targetId === requesterId', ({ assert }) => {
    assert.throws(() => UserDomainService.assertCanDelete(5, 5), CannotDeleteSelfError)
  })
})

test.group('DeleteUser — use case', () => {
  test("supprime un utilisateur quand l'id cible est different du requeteur", async ({
    assert,
  }) => {
    let deletedId = 0
    const repo = makeUserRepository({
      delete: async (id) => {
        deletedId = id
      },
    })

    const useCase = new DeleteUser(repo)
    await useCase.execute(10, 1)

    assert.equal(deletedId, 10)
  })

  test('lève CannotDeleteSelfError quand targetId === requesterId', async ({ assert }) => {
    const repo = makeUserRepository()
    const useCase = new DeleteUser(repo)

    try {
      await useCase.execute(5, 5)
      assert.fail('Devrait lever une erreur')
    } catch (error) {
      assert.instanceOf(error, CannotDeleteSelfError)
    }
  })

  test("n'appelle pas delete() quand self-delete detecte", async ({ assert }) => {
    let deleteCalled = false
    const repo = makeUserRepository({
      delete: async () => {
        deleteCalled = true
      },
    })

    const useCase = new DeleteUser(repo)

    try {
      await useCase.execute(3, 3)
    } catch {
      // attendu
    }

    assert.isFalse(deleteCalled)
  })
})
