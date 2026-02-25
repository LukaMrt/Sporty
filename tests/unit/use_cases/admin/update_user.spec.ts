import { test } from '@japa/runner'
import UpdateUser from '#use_cases/admin/update_user'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'
import type { User } from '#domain/entities/user'

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
          password: 'hashed',
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
          password: 'hashed',
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
})
