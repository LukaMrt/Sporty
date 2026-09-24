import { test } from '@japa/runner'
import GetFitnessProfile from '#use_cases/fitness/get_fitness_profile'
import { BanisterFitnessCalculator } from '#services/training/banister_fitness_calculator'
import { TrainingLoadCalculatorImpl } from '#services/training/training_load_calculator_impl'
import { InMemorySessionRepo, SilentLogger } from '#tests/helpers/base_mocks'
import { makeMockUserProfileRepository } from '#tests/helpers/mock_user_profile_repository'
import { addDaysIso } from '#domain/services/calendar'
import type { UserProfile } from '#domain/entities/user_profile'

const AS_OF = '2026-06-30'

function makeUseCase(sessions: InMemorySessionRepo, profile: Partial<UserProfile> | null = null) {
  return new GetFitnessProfile(
    sessions,
    makeMockUserProfileRepository({
      findByUserId: async () => (profile ? (profile as UserProfile) : null),
    }),
    new TrainingLoadCalculatorImpl(),
    new BanisterFitnessCalculator(),
    new SilentLogger()
  )
}

/** 4 sorties d'1 h par semaine pendant 12 semaines, dernière il y a `restDays` jours */
function seedImportedRuns(repo: InMemorySessionRepo, restDays: number, withHr: boolean) {
  let id = 1
  const last = addDaysIso(AS_OF, -restDays)
  for (let week = 0; week < 12; week++) {
    for (const offset of [0, 2, 4, 6]) {
      const date = addDaysIso(last, -(week * 7 + offset))
      repo.add({
        id: id++,
        date,
        durationMinutes: 60,
        distanceKm: 11,
        avgHeartRate: withHr ? 150 : null,
        perceivedEffort: null, // import Strava : pas d'effort perçu
      })
    }
  }
}

test.group('GetFitnessProfile (audit §18)', () => {
  test('B1 — séances importées sans effort mais avec FC → CTL > 0', async ({ assert }) => {
    const repo = new InMemorySessionRepo()
    seedImportedRuns(repo, 1, true)
    const result = await makeUseCase(repo, { maxHeartRate: 190, restingHeartRate: 50 }).execute(1, {
      asOf: AS_OF,
    })

    assert.isAbove(result.profile!.chronicTrainingLoad, 20)
    assert.equal(result.methods.trimp_exp, 48)
  })

  test('B3 — 7 jours de repos → ATL chute et TSB positif', async ({ assert }) => {
    const fresh = new InMemorySessionRepo()
    seedImportedRuns(fresh, 0, true)
    const rested = new InMemorySessionRepo()
    seedImportedRuns(rested, 7, true)
    const profile = { maxHeartRate: 190, restingHeartRate: 50 }

    const atLastRun = await makeUseCase(fresh, profile).execute(1, { asOf: AS_OF })
    const afterRest = await makeUseCase(rested, profile).execute(1, { asOf: AS_OF })

    assert.isBelow(afterRest.profile!.acuteTrainingLoad, atLastRun.profile!.acuteTrainingLoad)
    assert.isAbove(afterRest.profile!.trainingStressBalance, 0)
  })

  test('B4 — une sortie vélo n’est pas évaluée en rTSS', async ({ assert }) => {
    const repo = new InMemorySessionRepo()
    repo.add({ id: 1, date: AS_OF, sportSlug: 'cycling', distanceKm: 30, durationMinutes: 60 })
    const result = await makeUseCase(repo, { vdot: 50 }).execute(1, { asOf: AS_OF })
    assert.equal(result.methods.rtss, 0)
  })

  test('charge stockée prioritaire sur le recalcul', async ({ assert }) => {
    const repo = new InMemorySessionRepo()
    repo.add({ id: 1, date: AS_OF, trainingLoad: 120, loadMethod: 'trimp_exp' })
    const result = await makeUseCase(repo).execute(1, { asOf: AS_OF, withSeries: true })
    assert.equal(result.series[result.series.length - 1].tss, 120)
    assert.equal(result.methods.trimp_exp, 1)
  })

  test('aucune séance → profil null', async ({ assert }) => {
    const result = await makeUseCase(new InMemorySessionRepo()).execute(1, { asOf: AS_OF })
    assert.isNull(result.profile)
  })
})
