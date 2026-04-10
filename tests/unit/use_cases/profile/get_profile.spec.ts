import { test } from '@japa/runner'
import GetProfile from '#use_cases/profile/get_profile'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'
import { UserLevel, UserObjective } from '#domain/entities/user_profile'
import { TrainingState } from '#domain/value_objects/planning_types'

function makeMockProfileRepository(
  overrides: Partial<UserProfileRepository> = {}
): UserProfileRepository {
  class MockRepository extends UserProfileRepository {
    async create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
      return { id: 1, ...profile }
    }
    async findByUserId(): Promise<null> {
      return null
    }
    async update(): Promise<UserProfile> {
      return {
        id: 1,
        userId: 1,
        sportId: 1,
        level: null,
        objective: null,
        preferences: {
          speedUnit: 'min_km',
          distanceUnit: 'km',
          weightUnit: 'kg',
          weekStartsOn: 'monday',
          dateFormat: 'DD/MM/YYYY',
          locale: 'fr',
        },
        maxHeartRate: null,
        restingHeartRate: null,
        vma: null,
        sex: null,
        trainingState: TrainingState.Idle,
      }
    }
  }
  return Object.assign(new MockRepository(), overrides)
}

test.group('GetProfile — use case', () => {
  test('retourne null si aucun profil trouvé', async ({ assert }) => {
    const repo = makeMockProfileRepository({ findByUserId: async () => null })
    const useCase = new GetProfile(repo)
    const result = await useCase.execute(42)
    assert.isNull(result)
  })

  test('retourne le profil du user', async ({ assert }) => {
    const profile: UserProfile = {
      id: 1,
      userId: 42,
      sportId: 3,
      level: UserLevel.Intermediate,
      objective: UserObjective.RunFaster,
      preferences: {
        speedUnit: 'min_km',
        distanceUnit: 'km',
        weightUnit: 'kg',
        weekStartsOn: 'monday',
        dateFormat: 'DD/MM/YYYY',
        locale: 'fr',
      },
      maxHeartRate: null,
      restingHeartRate: null,
      vma: null,
      sex: null,
      trainingState: TrainingState.Idle,
    }
    const repo = makeMockProfileRepository({ findByUserId: async () => profile })
    const useCase = new GetProfile(repo)

    const result = await useCase.execute(42)

    assert.deepEqual(result, profile)
  })

  test('appelle findByUserId avec le bon userId', async ({ assert }) => {
    let calledWith: number | null = null
    const repo = makeMockProfileRepository({
      findByUserId: async (userId) => {
        calledWith = userId
        return null
      },
    })
    const useCase = new GetProfile(repo)
    await useCase.execute(99)

    assert.equal(calledWith, 99)
  })
})
