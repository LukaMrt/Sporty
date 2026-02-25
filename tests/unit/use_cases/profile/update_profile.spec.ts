import { test } from '@japa/runner'
import UpdateProfile from '#use_cases/profile/update_profile'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'
import { UserLevel, UserObjective } from '#domain/entities/user_profile'
import { makeMockUserRepository } from '#tests/helpers/mock_user_repository'

const DEFAULT_PROFILE: UserProfile = {
  id: 1,
  userId: 42,
  sportId: 1,
  level: UserLevel.Beginner,
  objective: null,
  preferences: {
    speedUnit: 'min_km',
    distanceUnit: 'km',
    weightUnit: 'kg',
    weekStartsOn: 'monday',
    dateFormat: 'DD/MM/YYYY',
  },
}

function makeMockProfileRepository(
  overrides: Partial<UserProfileRepository> = {}
): UserProfileRepository {
  class MockRepository extends UserProfileRepository {
    async create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
      return { id: 1, ...profile }
    }
    async findByUserId(): Promise<UserProfile> {
      return DEFAULT_PROFILE
    }
    async update(): Promise<UserProfile> {
      return DEFAULT_PROFILE
    }
  }
  return Object.assign(new MockRepository(), overrides)
}

test.group('UpdateProfile — use case', () => {
  test('met à jour le fullName du user', async ({ assert }) => {
    let updatedUserId: number | null = null
    let updatedData: Record<string, unknown> = {}
    const userRepo = makeMockUserRepository({
      update: async (id, data) => {
        updatedUserId = id
        updatedData = data as Record<string, unknown>
        return {
          id,
          fullName: data.fullName ?? '',
          email: 'test@test.com',
          password: '',
          role: 'user',
          onboardingCompleted: true,
          createdAt: '',
        }
      },
    })
    const profileRepo = makeMockProfileRepository()
    const useCase = new UpdateProfile(userRepo, profileRepo)

    await useCase.execute(42, { fullName: 'Nouveau Nom' })

    assert.equal(updatedUserId, 42)
    assert.equal(updatedData.fullName, 'Nouveau Nom')
  })

  test("met à jour l'email du user", async ({ assert }) => {
    let updatedData: Record<string, unknown> = {}
    const userRepo = makeMockUserRepository({
      update: async (id, data) => {
        updatedData = data as Record<string, unknown>
        return {
          id,
          fullName: '',
          email: data.email ?? '',
          password: '',
          role: 'user',
          onboardingCompleted: true,
          createdAt: '',
        }
      },
    })
    const profileRepo = makeMockProfileRepository()
    const useCase = new UpdateProfile(userRepo, profileRepo)

    await useCase.execute(42, { email: 'new@email.com' })

    assert.equal(updatedData.email, 'new@email.com')
  })

  test('met à jour le profil sportif', async ({ assert }) => {
    let capturedProfileUpdate: Partial<Omit<UserProfile, 'id' | 'userId'>> = {}
    const profileRepo = makeMockProfileRepository({
      update: async (userId, data) => {
        capturedProfileUpdate = data
        return { ...DEFAULT_PROFILE, ...data, userId }
      },
    })
    const userRepo = makeMockUserRepository()
    const useCase = new UpdateProfile(userRepo, profileRepo)

    await useCase.execute(42, {
      sportId: 3,
      level: UserLevel.Advanced,
      objective: UserObjective.PrepareCompetition,
    })

    assert.equal(capturedProfileUpdate.sportId, 3)
    assert.equal(capturedProfileUpdate.level, UserLevel.Advanced)
    assert.equal(capturedProfileUpdate.objective, UserObjective.PrepareCompetition)
  })

  test("n'appelle pas update user si aucun champ user fourni", async ({ assert }) => {
    let updateUserCalled = false
    const userRepo = makeMockUserRepository({
      update: async () => {
        updateUserCalled = true
        return {
          id: 1,
          fullName: '',
          email: '',
          password: '',
          role: 'user',
          onboardingCompleted: true,
          createdAt: '',
        }
      },
    })
    const profileRepo = makeMockProfileRepository()
    const useCase = new UpdateProfile(userRepo, profileRepo)

    await useCase.execute(42, { level: UserLevel.Intermediate })

    assert.isFalse(updateUserCalled)
  })

  test("n'appelle pas update profile si aucun champ profil fourni", async ({ assert }) => {
    let updateProfileCalled = false
    const profileRepo = makeMockProfileRepository({
      update: async () => {
        updateProfileCalled = true
        return DEFAULT_PROFILE
      },
    })
    const userRepo = makeMockUserRepository()
    const useCase = new UpdateProfile(userRepo, profileRepo)

    await useCase.execute(42, { fullName: 'Test' })

    assert.isFalse(updateProfileCalled)
  })

  test('retourne user et profil mis à jour', async ({ assert }) => {
    const userRepo = makeMockUserRepository({
      update: async (id, data) => ({
        id,
        fullName: data.fullName ?? 'Default',
        email: 'test@test.com',
        password: '',
        role: 'user',
        onboardingCompleted: true,
        createdAt: '',
      }),
    })
    const updatedProfile = { ...DEFAULT_PROFILE, level: UserLevel.Advanced }
    const profileRepo = makeMockProfileRepository({
      update: async () => updatedProfile,
    })
    const useCase = new UpdateProfile(userRepo, profileRepo)

    const result = await useCase.execute(42, {
      fullName: 'Luka',
      level: UserLevel.Advanced,
    })

    assert.equal(result.user.fullName, 'Luka')
    assert.equal(result.profile?.level, UserLevel.Advanced)
  })
})
