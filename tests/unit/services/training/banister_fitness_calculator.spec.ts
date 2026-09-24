import { test } from '@japa/runner'
import { BanisterFitnessCalculator } from '#services/training/banister_fitness_calculator'
import type { TrainingLoad } from '#domain/value_objects/training_load'

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function makeHistory(
  days: number,
  tss: number,
  startDate = '2024-01-01'
): { date: string; load: TrainingLoad }[] {
  return Array.from({ length: days }, (_, i) => ({
    date: addDays(startDate, i),
    load: { value: tss, method: 'rtss' as const },
  }))
}

const calc = new BanisterFitnessCalculator()

// ── Historique vide ───────────────────────────────────────────────────────────

test.group('historique vide', () => {
  test('retourne toutes les valeurs à 0', ({ assert }) => {
    const result = calc.calculate([])
    assert.equal(result.chronicTrainingLoad, 0)
    assert.equal(result.acuteTrainingLoad, 0)
    assert.equal(result.trainingStressBalance, 0)
    assert.equal(result.acuteChronicWorkloadRatio, 0)
    assert.instanceOf(result.calculatedAt, Date)
  })

  test('série vide', ({ assert }) => {
    assert.deepEqual(calc.series([]), [])
  })
})

// ── Régime établi ─────────────────────────────────────────────────────────────

test.group('charge constante', () => {
  test('TSS constant → CTL = ATL = TSS grâce à l’amorçage, TSB ≈ 0', ({ assert }) => {
    const history = makeHistory(60, 100)
    const result = calc.calculate(history, '2024-02-29')
    assert.approximately(result.chronicTrainingLoad, 100, 0.5)
    assert.approximately(result.acuteTrainingLoad, 100, 0.5)
    assert.approximately(result.trainingStressBalance, 0, 0.5)
    assert.approximately(result.acuteChronicWorkloadRatio, 1, 0.01)
  })

  test('TSB = CTL − ATL', ({ assert }) => {
    const history = [...makeHistory(30, 50), ...makeHistory(5, 150, '2024-01-31')]
    const result = calc.calculate(history, '2024-02-04')
    const expected = Math.round((result.chronicTrainingLoad - result.acuteTrainingLoad) * 10) / 10
    assert.approximately(result.trainingStressBalance, expected, 0.11)
    assert.isBelow(result.trainingStressBalance, 0)
  })
})

// ── Décroissance jusqu'à aujourd'hui (bug B3) ────────────────────────────────

test.group('décroissance après la dernière séance', () => {
  test('7 jours de repos → ATL chute et TSB devient positif', ({ assert }) => {
    const history = makeHistory(84, 60)
    const lastDay = addDays('2024-01-01', 83)
    const atLastSession = calc.calculate(history, lastDay)
    const afterRest = calc.calculate(history, addDays(lastDay, 7))

    assert.isBelow(afterRest.acuteTrainingLoad, atLastSession.acuteTrainingLoad / 2)
    assert.isAbove(afterRest.trainingStressBalance, 0)
    assert.isBelow(afterRest.chronicTrainingLoad, atLastSession.chronicTrainingLoad)
  })

  test('la série couvre chaque jour jusqu’à asOf inclus', ({ assert }) => {
    const series = calc.series(makeHistory(3, 100), '2024-01-10')
    assert.lengthOf(series, 10)
    assert.equal(series[0].date, '2024-01-01')
    assert.equal(series[9].date, '2024-01-10')
    assert.equal(series[9].tss, 0)
  })

  test('asOf antérieur à la première séance → série vide', ({ assert }) => {
    assert.deepEqual(calc.series(makeHistory(3, 100), '2023-12-31'), [])
  })
})

// ── Agrégation ────────────────────────────────────────────────────────────────

test.group('agrégation', () => {
  test('plusieurs séances le même jour sont additionnées', ({ assert }) => {
    const series = calc.series(
      [
        { date: '2024-01-01', load: { value: 40, method: 'rpe' } },
        { date: '2024-01-01', load: { value: 60, method: 'rpe' } },
      ],
      '2024-01-01'
    )
    assert.equal(series[0].tss, 100)
  })

  test("l'ordre de l'historique n'a pas d'importance", ({ assert }) => {
    const history = makeHistory(20, 80)
    const shuffled = [...history].reverse()
    assert.deepEqual(calc.series(history, '2024-01-25'), calc.series(shuffled, '2024-01-25'))
  })
})
