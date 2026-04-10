import { test } from '@japa/runner'
import EstimateVdot from '#use_cases/planning/estimate_vdot'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import type { TrainingSession } from '#domain/entities/training_session'
import type { UserProfile } from '#domain/entities/user_profile'
import type { TrainingLoad } from '#domain/value_objects/training_load'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { PaginatedResult } from '#domain/entities/pagination'
import { TrainingState } from '#domain/value_objects/planning_types'
import { UserLevel } from '#domain/entities/user_profile'

// ── Helpers ────────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  id: 1,
  userId: 1,
  sportId: 1,
  level: UserLevel.Intermediate,
  objective: null,
  preferences: {
    speedUnit: 'min_km',
    distanceUnit: 'km',
    weightUnit: 'kg',
    weekStartsOn: 'monday',
    dateFormat: 'DD/MM/YYYY',
    locale: 'fr',
  },
  maxHeartRate: 180,
  restingHeartRate: 55,
  vma: null,
  sex: null,
  trainingState: TrainingState.Idle,
}

function makeRecentRunSessions(count: number): TrainingSession[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    userId: 1,
    sportId: 1,
    sportName: 'Course à pied',
    date: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    durationMinutes: 45,
    distanceKm: 8,
    avgHeartRate: 155,
    perceivedEffort: 6,
    sportMetrics: {},
    notes: null,
    importedFrom: 'strava',
    createdAt: new Date().toISOString(),
  }))
}

function makeMockSessionRepository(sessions: TrainingSession[]): SessionRepository {
  class MockSessionRepository extends SessionRepository {
    async create(): Promise<TrainingSession> {
      throw new Error('not implemented')
    }
    async findAllByUserId(): Promise<PaginatedResult<TrainingSession>> {
      return {
        data: sessions,
        meta: { page: 1, lastPage: 1, perPage: 100, total: sessions.length },
      }
    }
    async findById(): Promise<TrainingSession | null> {
      return null
    }
    async findByIdIncludingTrashed(): Promise<TrainingSession | null> {
      return null
    }
    async update(): Promise<TrainingSession> {
      throw new Error('not implemented')
    }
    async findTrashedByUserId(): Promise<TrainingSession[]> {
      return []
    }
    async softDelete(): Promise<void> {}
    async restore(): Promise<void> {}
    async findByUserIdAndDateRange(): Promise<TrainingSession[]> {
      return sessions
    }
    async findByUserAndExternalIds(): Promise<{ externalId: string; id: number }[]> {
      return []
    }
    async forceDelete(): Promise<void> {}
  }
  return new MockSessionRepository()
}

function makeMockProfileRepository(profile: UserProfile | null): UserProfileRepository {
  class MockProfileRepository extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
    async findByUserId(): Promise<UserProfile | null> {
      return profile
    }
    async update(): Promise<UserProfile> {
      return profile!
    }
  }
  return new MockProfileRepository()
}

function makeMockLoadCalculator(): TrainingLoadCalculator {
  class MockLoadCalculator extends TrainingLoadCalculator {
    calculate(): TrainingLoad {
      return { value: 50, method: 'rpe' }
    }
  }
  return new MockLoadCalculator()
}

function makeMockFitnessCalculator(): FitnessProfileCalculator {
  class MockFitnessCalculator extends FitnessProfileCalculator {
    calculate(): FitnessProfile {
      return {
        chronicTrainingLoad: 45,
        acuteTrainingLoad: 52,
        trainingStressBalance: -7,
        acuteChronicWorkloadRatio: 1.15,
        calculatedAt: new Date(),
      }
    }
  }
  return new MockFitnessCalculator()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.group('EstimateVdot — use case', () => {
  test('niveau 1 : estime depuis historique si ≥ 3 séances récentes', async ({ assert }) => {
    const sessions = makeRecentRunSessions(5)
    const useCase = new EstimateVdot(
      makeMockSessionRepository(sessions),
      makeMockProfileRepository(DEFAULT_PROFILE),
      makeMockLoadCalculator(),
      makeMockFitnessCalculator()
    )

    const result = await useCase.execute(1)

    assert.equal(result.method, 'history')
    assert.isAbove(result.vdot, 15)
    assert.isBelow(result.vdot, 85)
    assert.exists(result.paceZones.easy)
    assert.exists(result.paceZones.threshold)
  })

  test('niveau 2 : fallback VMA si pas assez de séances', async ({ assert }) => {
    const profileWithVma = { ...DEFAULT_PROFILE, vma: 15.5 }
    const useCase = new EstimateVdot(
      makeMockSessionRepository([]), // aucune séance
      makeMockProfileRepository(profileWithVma),
      makeMockLoadCalculator(),
      makeMockFitnessCalculator()
    )

    const result = await useCase.execute(1)

    assert.equal(result.method, 'vma')
    assert.isAbove(result.vdot, 15)
  })

  test('niveau 3 : fallback questionnaire si pas de VMA ni séances', async ({ assert }) => {
    const useCase = new EstimateVdot(
      makeMockSessionRepository([]),
      makeMockProfileRepository({ ...DEFAULT_PROFILE, vma: null }),
      makeMockLoadCalculator(),
      makeMockFitnessCalculator()
    )

    const result = await useCase.execute(1, {
      frequency: 'regular',
      experience: 'intermediate',
      typicalDistance: '5k_to_10k',
    })

    assert.equal(result.method, 'questionnaire')
    assert.equal(result.vdot, 38)
  })

  test('retourne des pace zones valides pour chaque méthode', async ({ assert }) => {
    const useCase = new EstimateVdot(
      makeMockSessionRepository([]),
      makeMockProfileRepository({ ...DEFAULT_PROFILE, vma: 14 }),
      makeMockLoadCalculator(),
      makeMockFitnessCalculator()
    )

    const result = await useCase.execute(1)

    // Zone E plus lente que zone T, elle-même plus lente que zone I
    assert.isAbove(result.paceZones.easy.maxPacePerKm, result.paceZones.threshold.minPacePerKm)
    assert.isAbove(result.paceZones.threshold.minPacePerKm, result.paceZones.interval.minPacePerKm)
  })

  test("retourne fitnessProfile null si aucune séance dans l'historique complet", async ({
    assert,
  }) => {
    const useCase = new EstimateVdot(
      makeMockSessionRepository([]),
      makeMockProfileRepository({ ...DEFAULT_PROFILE, vma: 15 }),
      makeMockLoadCalculator(),
      makeMockFitnessCalculator()
    )

    const result = await useCase.execute(1)
    assert.isNull(result.fitnessProfile)
  })
})
