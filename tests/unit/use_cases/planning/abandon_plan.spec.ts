import { test } from '@japa/runner'
import AbandonPlan from '#use_cases/planning/abandon_plan'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { PlanStatus, TrainingState } from '#domain/value_objects/planning_types'
import type { UserProfile } from '#domain/entities/user_profile'
import CloseFinishedGoal from '#use_cases/planning/close_finished_goal'
import { InMemoryGoalRepo, InMemoryPlanRepo } from '#tests/helpers/base_mocks'
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
    const useCase = new AbandonPlan(
      profileRepo,
      new CloseFinishedGoal(new InMemoryGoalRepo(), new InMemoryPlanRepo())
    )

    await useCase.execute(1)

    assert.equal(profileRepo.updatedTrainingState, TrainingState.Idle)
  })

  test("n'affecte pas les plans existants", async ({ assert }) => {
    const profileRepo = makeUserProfileRepo(USER_PROFILE)
    const useCase = new AbandonPlan(
      profileRepo,
      new CloseFinishedGoal(new InMemoryGoalRepo(), new InMemoryPlanRepo())
    )

    // Ne doit pas lancer d'erreur même sans plan actif ou terminé
    await assert.doesNotReject(() => useCase.execute(1))
  })

  test("« Plus tard » clôt l'objectif du plan terminé", async ({ assert }) => {
    const goals = new InMemoryGoalRepo()
    const goal = await goals.create({
      userId: 1,
      targetDistanceKm: 21.1,
      targetTimeMinutes: 120,
      eventDate: null,
      status: 'active',
    })
    const plans = new InMemoryPlanRepo()
    const plan = await plans.seedPlan({ startDate: '2026-01-05', weeks: 4, goalId: goal.id })
    await plans.update(plan.id, { status: PlanStatus.Completed })
    const useCase = new AbandonPlan(
      makeUserProfileRepo(USER_PROFILE),
      new CloseFinishedGoal(goals, plans)
    )

    await useCase.execute(1)

    assert.equal((await goals.findById(goal.id))!.status, 'achieved')
  })
})
