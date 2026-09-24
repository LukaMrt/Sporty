import { test } from '@japa/runner'
import DeleteUser from '#use_cases/admin/delete_user'
import { CannotDeleteSelfError } from '#domain/errors/cannot_delete_self_error'
import { LastAdminError } from '#domain/errors/last_admin_error'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'
import { UserDomainService } from '#domain/services/user_domain_service'
import { makeMockUserRepository, makeUser } from '#tests/helpers/mock_user_repository'
import { makeMockGpxFileStorage } from '#tests/helpers/mock_gpx_file_storage'

test.group('UserDomainService.assertCanDelete', () => {
  test('ne lève pas si targetId !== requesterId', ({ assert }) => {
    assert.doesNotThrow(() => UserDomainService.assertCanDelete(10, 1))
  })

  test('lève CannotDeleteSelfError si targetId === requesterId', ({ assert }) => {
    assert.throws(() => UserDomainService.assertCanDelete(5, 5), CannotDeleteSelfError)
  })
})

test.group('UserDomainService.assertKeepsAnAdmin', () => {
  test('lève LastAdminError en retirant le dernier admin', ({ assert }) => {
    assert.throws(
      () => UserDomainService.assertKeepsAnAdmin(makeUser({ role: 'admin' }), 1, null),
      LastAdminError
    )
  })

  test("ne lève pas pour un simple utilisateur ou s'il reste des admins", ({ assert }) => {
    assert.doesNotThrow(() =>
      UserDomainService.assertKeepsAnAdmin(makeUser({ role: 'user' }), 1, null)
    )
    assert.doesNotThrow(() =>
      UserDomainService.assertKeepsAnAdmin(makeUser({ role: 'admin' }), 2, null)
    )
    assert.doesNotThrow(() =>
      UserDomainService.assertKeepsAnAdmin(makeUser({ role: 'admin' }), 1, 'admin')
    )
  })
})

test.group('DeleteUser — use case', () => {
  test('supprime un utilisateur et ses fichiers GPX', async ({ assert }) => {
    let deletedId = 0
    let purgedUserId = 0
    const repo = makeMockUserRepository({
      findById: async (id) => makeUser({ id }),
      delete: async (id) => {
        deletedId = id
      },
    })
    const storage = makeMockGpxFileStorage({
      deleteAllForUser: async (userId) => {
        purgedUserId = userId
      },
    })

    await new DeleteUser(repo, storage).execute(10, 1)

    assert.equal(deletedId, 10)
    assert.equal(purgedUserId, 10)
  })

  test('lève CannotDeleteSelfError quand targetId === requesterId', async ({ assert }) => {
    let deleteCalled = false
    const repo = makeMockUserRepository({
      delete: async () => {
        deleteCalled = true
      },
    })

    await assert.rejects(
      () => new DeleteUser(repo, makeMockGpxFileStorage()).execute(5, 5),
      CannotDeleteSelfError
    )
    assert.isFalse(deleteCalled)
  })

  test('lève UserNotFoundError si la cible est inconnue', async ({ assert }) => {
    const repo = makeMockUserRepository({ findById: async () => null })

    await assert.rejects(
      () => new DeleteUser(repo, makeMockGpxFileStorage()).execute(10, 1),
      UserNotFoundError
    )
  })

  test('refuse de supprimer le dernier administrateur', async ({ assert }) => {
    const repo = makeMockUserRepository({
      findById: async (id) => makeUser({ id, role: 'admin' }),
      countByRole: async () => 1,
    })

    await assert.rejects(
      () => new DeleteUser(repo, makeMockGpxFileStorage()).execute(10, 1),
      LastAdminError
    )
  })
})
