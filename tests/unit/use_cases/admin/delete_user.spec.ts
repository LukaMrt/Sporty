import { test } from '@japa/runner'
import DeleteUser from '#use_cases/admin/delete_user'
import { CannotDeleteSelfError } from '#domain/errors/cannot_delete_self_error'
import { UserDomainService } from '#domain/services/user_domain_service'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'

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
    const repo = makeMockUserRepository({
      delete: async (id) => {
        deletedId = id
      },
    })

    const useCase = new DeleteUser(repo)
    await useCase.execute(10, 1)

    assert.equal(deletedId, 10)
  })

  test('lève CannotDeleteSelfError quand targetId === requesterId', async ({ assert }) => {
    const repo = makeMockUserRepository()
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
    const repo = makeMockUserRepository({
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
