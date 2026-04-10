import { test } from '@japa/runner'
import AbandonPlan from '#use_cases/planning/abandon_plan'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingState } from '#domain/value_objects/planning_types'
import type { UserProfile } from '#domain/entities/user_profile'
import { UserLevel } from '#domain/entities/user_profile'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_PROFILE: UserProfile = {
  id: 1,
  userId: 1,
  sportId: 1,
  level: UserLevel.Intermediate,
  objective: null,
  preferences: {} as never,
  maxHeartRate: null,
  restingHeartRate: null,
  vma: null,
  sex: null,
  trainingState: TrainingState.Transition,
}

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeUserProfileRepo(
  profile: UserProfile
): UserProfileRepository & { updatedTrainingState: TrainingState | null } {
  let updatedTrainingState: TrainingState | null = null

  class MockProfileRepo extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not impl')
    }
    async findByUserId(): Promise<UserProfile | null> {
      return profile
    }
    async update(_userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
      if (data.trainingState !== undefined) updatedTrainingState = data.trainingState
      return { ...profile, ...data }
    }
  }

  const repo = new MockProfileRepo() as unknown as UserProfileRepository & {
    updatedTrainingState: TrainingState | null
  }
  Object.defineProperty(repo, 'updatedTrainingState', { get: () => updatedTrainingState })
  return repo
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.group('AbandonPlan', () => {
  test('remet le trainingState à Idle', async ({ assert }) => {
    const profileRepo = makeUserProfileRepo(USER_PROFILE)
    const useCase = new AbandonPlan(profileRepo)

    await useCase.execute(1)

    assert.equal(profileRepo.updatedTrainingState, TrainingState.Idle)
  })

  test("n'affecte pas les plans existants", async ({ assert }) => {
    const profileRepo = makeUserProfileRepo(USER_PROFILE)
    const useCase = new AbandonPlan(profileRepo)

    // Ne doit pas lancer d'erreur même sans plan actif ou terminé
    await assert.doesNotReject(() => useCase.execute(1))
  })
})
