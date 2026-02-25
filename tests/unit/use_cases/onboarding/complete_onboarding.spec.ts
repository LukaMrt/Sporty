import { test } from '@japa/runner'
import CompleteOnboarding from '#use_cases/onboarding/complete_onboarding'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { UserLevel, UserObjective } from '#domain/entities/user_profile'
import type { UserProfile } from '#domain/entities/user_profile'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'

function makeUserProfileRepository(
  overrides: Partial<UserProfileRepository> = {}
): UserProfileRepository {
  class MockProfileRepository extends UserProfileRepository {
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
        },
      }
    }
  }
  return Object.assign(new MockProfileRepository(), overrides)
}

test.group('CompleteOnboarding — use case', () => {
  test('crée le profil avec les données du wizard', async ({ assert }) => {
    let capturedProfile: Omit<UserProfile, 'id'> | null = null
    const profileRepo = makeUserProfileRepository({
      create: async (profile) => {
        capturedProfile = profile
        return { id: 1, ...profile }
      },
    })
    const userRepo = makeMockUserRepository()

    const useCase = new CompleteOnboarding(profileRepo, userRepo)
    const result = await useCase.execute({
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
      },
    })

    assert.equal(result.userId, 42)
    assert.equal(result.sportId, 3)
    assert.equal(result.level, UserLevel.Intermediate)
    assert.equal(result.objective, UserObjective.RunFaster)
    assert.equal(result.preferences.speedUnit, 'min_km')
    assert.isNotNull(capturedProfile)
    assert.equal(capturedProfile!.userId, 42)
  })

  test('marque onboardingCompleted sur le user', async ({ assert }) => {
    let markedUserId: number | null = null
    const profileRepo = makeUserProfileRepository()
    const userRepo = makeMockUserRepository({
      markOnboardingCompleted: async (userId) => {
        markedUserId = userId
      },
    })

    const useCase = new CompleteOnboarding(profileRepo, userRepo)
    await useCase.execute({
      userId: 7,
      sportId: 1,
      level: UserLevel.Beginner,
      objective: null,
      preferences: {
        speedUnit: 'km_h',
        distanceUnit: 'km',
        weightUnit: 'kg',
        weekStartsOn: 'monday',
        dateFormat: 'DD/MM/YYYY',
      },
    })

    assert.equal(markedUserId, 7)
  })

  test("accepte objective null (skip de l'étape 3)", async ({ assert }) => {
    let capturedObjective: UserObjective | null = UserObjective.RunFaster
    const profileRepo = makeUserProfileRepository({
      create: async (profile) => {
        capturedObjective = profile.objective
        return { id: 1, ...profile }
      },
    })
    const userRepo = makeMockUserRepository()

    const useCase = new CompleteOnboarding(profileRepo, userRepo)
    await useCase.execute({
      userId: 1,
      sportId: 1,
      level: UserLevel.Advanced,
      objective: null,
      preferences: {
        speedUnit: 'min_km',
        distanceUnit: 'km',
        weightUnit: 'kg',
        weekStartsOn: 'monday',
        dateFormat: 'DD/MM/YYYY',
      },
    })

    assert.isNull(capturedObjective)
  })

  test('initialise les préférences par défaut en dehors de speedUnit', async ({ assert }) => {
    let capturedPreferences: UserProfile['preferences'] | null = null
    const profileRepo = makeUserProfileRepository({
      create: async (profile) => {
        capturedPreferences = profile.preferences
        return { id: 1, ...profile }
      },
    })
    const userRepo = makeMockUserRepository()

    const useCase = new CompleteOnboarding(profileRepo, userRepo)
    await useCase.execute({
      userId: 1,
      sportId: 1,
      level: UserLevel.Beginner,
      objective: null,
      preferences: {
        speedUnit: 'km_h',
        distanceUnit: 'km',
        weightUnit: 'kg',
        weekStartsOn: 'monday',
        dateFormat: 'DD/MM/YYYY',
      },
    })

    assert.isNotNull(capturedPreferences)
    assert.equal(capturedPreferences!.distanceUnit, 'km')
    assert.equal(capturedPreferences!.weightUnit, 'kg')
    assert.equal(capturedPreferences!.weekStartsOn, 'monday')
    assert.equal(capturedPreferences!.speedUnit, 'km_h')
  })
})
