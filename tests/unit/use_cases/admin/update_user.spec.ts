import { test } from '@japa/runner'
import UpdateUser from '#use_cases/admin/update_user'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import type { User } from '#domain/entities/user'
import { makeUser } from '#tests/helpers/mock_user_repository'
import { LastAdminError } from '#domain/errors/last_admin_error'

test.group('UpdateUser — use case', () => {
  test('délègue la mise à jour au repository avec les données fournies', async ({ assert }) => {
    let capturedId = 0
    let capturedData: Partial<Omit<User, 'id'>> = {}

    const repo = makeMockUserRepository({
      update: async (id, data) => {
        capturedId = id
        capturedData = data
        return {
          id,
          fullName: data.fullName!,
          email: data.email!,
          role: 'user',
          onboardingCompleted: false,
          createdAt: '',
        }
      },
    })

    const useCase = new UpdateUser(repo)
    await useCase.execute(5, { fullName: 'Nouveau Nom', email: 'nouveau@example.com' })

    assert.equal(capturedId, 5)
    assert.equal(capturedData.fullName, 'Nouveau Nom')
    assert.equal(capturedData.email, 'nouveau@example.com')
  })

  test('fonctionne avec uniquement le nom fourni', async ({ assert }) => {
    let capturedData: Partial<Omit<User, 'id'>> = {}

    const repo = makeMockUserRepository({
      update: async (id, data) => {
        capturedData = data
        return {
          id,
          fullName: data.fullName!,
          email: 'email@example.com',
          role: 'user',
          onboardingCompleted: false,
          createdAt: '',
        }
      },
    })

    const useCase = new UpdateUser(repo)
    await useCase.execute(1, { fullName: 'Seul Nom' })

    assert.equal(capturedData.fullName, 'Seul Nom')
    assert.isUndefined(capturedData.email)
  })

  test('refuse de rétrograder le dernier administrateur', async ({ assert }) => {
    let updated = false
    const repo = makeMockUserRepository({
      findById: async () => makeUser({ id: 5, role: 'admin' }),
      countByRole: async () => 1,
      update: async () => {
        updated = true
        return makeUser()
      },
    })

    await assert.rejects(() => new UpdateUser(repo).execute(5, { role: 'user' }), LastAdminError)
    assert.isFalse(updated)
  })

  test("autorise la rétrogradation s'il reste un autre administrateur", async ({ assert }) => {
    let capturedRole: User['role'] | undefined
    const repo = makeMockUserRepository({
      findById: async () => makeUser({ id: 5, role: 'admin' }),
      countByRole: async () => 2,
      update: async (_id, data) => {
        capturedRole = data.role
        return makeUser({ role: data.role })
      },
    })

    await new UpdateUser(repo).execute(5, { role: 'user' })
    assert.equal(capturedRole, 'user')
  })
})
