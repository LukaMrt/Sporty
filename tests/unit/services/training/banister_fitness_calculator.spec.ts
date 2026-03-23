import { test } from '@japa/runner'
import { BanisterFitnessCalculator } from '#services/training/banister_fitness_calculator'
import type { TrainingLoad } from '#domain/value_objects/training_load'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHistory(
  days: number,
  tss: number,
  startDate = '2024-01-01'
): { date: string; load: TrainingLoad }[] {
  const history: { date: string; load: TrainingLoad }[] = []
  const start = new Date(startDate)
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    history.push({
      date: d.toISOString().slice(0, 10),
      load: { value: tss, method: 'rtss' },
    })
  }
  return history
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
})

// ── Valeurs numériques connues ─────────────────────────────────────────────────

test.group('valeurs Banister — historique connu', () => {
  test('1 jour à TSS=100 — CTL et ATL corrects', ({ assert }) => {
    const result = calc.calculate(makeHistory(1, 100))
    // CTL = 0 + (100 - 0) / 42 ≈ 2.381
    assert.approximately(result.chronicTrainingLoad, 2.4, 0.05)
    // ATL = 0 + (100 - 0) / 7 ≈ 14.286
    assert.approximately(result.acuteTrainingLoad, 14.3, 0.05)
  })

  test('1 jour à TSS=100 — TSB = CTL - ATL', ({ assert }) => {
    const result = calc.calculate(makeHistory(1, 100))
    const expectedTsb =
      Math.round((result.chronicTrainingLoad - result.acuteTrainingLoad) * 10) / 10
    assert.equal(result.trainingStressBalance, expectedTsb)
  })

  test('ACWR = ATL / CTL quand CTL > 0', ({ assert }) => {
    // Après 42+ jours, CTL sera significatif
    const result = calc.calculate(makeHistory(60, 100))
    assert.isAbove(result.chronicTrainingLoad, 0)
    // ACWR est calculé depuis les valeurs brutes (avant arrondi individuel de ATL/CTL),
    // donc on tolère ±0.001 plutôt que de comparer des valeurs arrondies en cascade
    const approxAcwr = result.acuteTrainingLoad / result.chronicTrainingLoad
    assert.approximately(result.acuteChronicWorkloadRatio, approxAcwr, 0.001)
  })

  test('60 jours à TSS=100 — CTL converge vers ~100 (plateau EMA)', ({ assert }) => {
    // L'EMA avec τ=42 converge lentement. Après 60 jours à TSS constant,
    // CTL = TSS * (1 - (1 - 1/42)^60) ≈ 75
    const result = calc.calculate(makeHistory(60, 100))
    assert.isAbove(result.chronicTrainingLoad, 50)
    assert.isBelow(result.chronicTrainingLoad, 100)
  })

  test('ATL réagit plus vite que CTL (τ plus court)', ({ assert }) => {
    // Après une longue base, on simule une semaine à 0 TSS
    const baseWeeks = makeHistory(42, 80)
    const restWeek = makeHistory(7, 0, '2024-02-13') // jours suivants
    const result = calc.calculate([...baseWeeks, ...restWeek])
    // Après repos, ATL doit baisser plus vite que CTL
    assert.isBelow(result.acuteTrainingLoad, result.chronicTrainingLoad)
    // TSB doit être positif (forme > fatigue)
    assert.isAbove(result.trainingStressBalance, 0)
  })
})

// ── ACWR — guard division par zéro ────────────────────────────────────────────

test.group('ACWR — protection division par zéro', () => {
  test('CTL = 0 → ACWR retourne 0 (pas de division par zéro)', ({ assert }) => {
    // Un seul jour avec TSS=0 : CTL et ATL restent à 0
    const result = calc.calculate([{ date: '2024-01-01', load: { value: 0, method: 'rpe' } }])
    assert.equal(result.chronicTrainingLoad, 0)
    assert.equal(result.acuteChronicWorkloadRatio, 0)
  })
})

// ── Déterminisme ──────────────────────────────────────────────────────────────

test.group('déterminisme', () => {
  test('le même historique produit toujours le même résultat', ({ assert }) => {
    const history = makeHistory(30, 80)
    const r1 = calc.calculate(history)
    const r2 = calc.calculate(history)
    assert.equal(r1.chronicTrainingLoad, r2.chronicTrainingLoad)
    assert.equal(r1.acuteTrainingLoad, r2.acuteTrainingLoad)
    assert.equal(r1.trainingStressBalance, r2.trainingStressBalance)
    assert.equal(r1.acuteChronicWorkloadRatio, r2.acuteChronicWorkloadRatio)
  })

  test("l'ordre d'entrée des données ne change pas le résultat (tri interne)", ({ assert }) => {
    const history = makeHistory(10, 80)
    const shuffled = [...history].reverse()
    const r1 = calc.calculate(history)
    const r2 = calc.calculate(shuffled)
    assert.equal(r1.chronicTrainingLoad, r2.chronicTrainingLoad)
    assert.equal(r1.acuteTrainingLoad, r2.acuteTrainingLoad)
  })
})

// ── Performance ───────────────────────────────────────────────────────────────

test.group('performance', () => {
  test('60+ jours calculés en < 200ms (AC #3)', ({ assert }) => {
    const history = makeHistory(365, 80) // 1 an complet
    const start = Date.now()
    calc.calculate(history)
    const elapsed = Date.now() - start
    assert.isBelow(elapsed, 200)
  })
})
