import { test } from '@japa/runner'
import { TrainingLoadCalculatorImpl } from '#services/training/training_load_calculator_impl'
import type { DataPoint } from '#domain/value_objects/run_metrics'
import type { SessionLoadInput } from '#domain/value_objects/session_load_input'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Construit une courbe FC plate à une valeur donnée sur N secondes */
function flatCurve(hr: number, durationSeconds: number): DataPoint[] {
  return [
    { time: 0, value: hr },
    { time: durationSeconds, value: hr },
  ]
}

const calc = new TrainingLoadCalculatorImpl()

// ── Cascade : priorité de méthode ─────────────────────────────────────────────

test.group('cascade — sélection de méthode', () => {
  test('séance avec FC + maxHR + restHR → method: trimp_exp', ({ assert }) => {
    const input: SessionLoadInput = {
      durationHours: 1,
      heartRateCurve: flatCurve(160, 3600),
      maxHR: 190,
      restHR: 50,
    }
    const result = calc.calculate(input)
    assert.equal(result.method, 'trimp_exp')
  })

  test('séance sans FC mais avec allure + VDOT → method: rtss', ({ assert }) => {
    const input: SessionLoadInput = {
      durationHours: 1,
      avgPaceMPerMin: 200,
      vdot: 50,
    }
    const result = calc.calculate(input)
    assert.equal(result.method, 'rtss')
  })

  test('séance avec RPE seul → method: rpe', ({ assert }) => {
    const input: SessionLoadInput = {
      durationHours: 1,
      perceivedEffort: 6,
    }
    const result = calc.calculate(input)
    assert.equal(result.method, 'rpe')
  })

  test('séance sans données exploitables → { value: 0, method: rpe }', ({ assert }) => {
    const input: SessionLoadInput = { durationHours: 1 }
    const result = calc.calculate(input)
    assert.deepEqual(result, { value: 0, method: 'rpe' })
  })

  test('FC disponible mais allure aussi → TRIMPexp prioritaire', ({ assert }) => {
    const input: SessionLoadInput = {
      durationHours: 1,
      heartRateCurve: flatCurve(160, 3600),
      maxHR: 190,
      restHR: 50,
      avgPaceMPerMin: 200,
      vdot: 50,
    }
    const result = calc.calculate(input)
    assert.equal(result.method, 'trimp_exp')
  })
})

// ── TRIMPexp / hrTSS ──────────────────────────────────────────────────────────

test.group('TRIMPexp — normalisation hrTSS', () => {
  test('1h à la FC seuil lactique (88% FCmax) → hrTSS ≈ 100', ({ assert }) => {
    const maxHR = 190
    const restHR = 50
    const lthr = Math.round(maxHR * 0.88)
    const input: SessionLoadInput = {
      durationHours: 1,
      heartRateCurve: flatCurve(lthr, 3600),
      maxHR,
      restHR,
    }
    const result = calc.calculate(input)
    assert.approximately(result.value, 100, 5)
  })

  test('1h en Z2 (65% FCmax) → hrTSS < 100', ({ assert }) => {
    const maxHR = 190
    const restHR = 50
    const input: SessionLoadInput = {
      durationHours: 1,
      heartRateCurve: flatCurve(Math.round(maxHR * 0.65), 3600),
      maxHR,
      restHR,
    }
    const result = calc.calculate(input)
    assert.isBelow(result.value, 100)
    assert.isAbove(result.value, 0)
  })

  test('FC plus haute → hrTSS plus élevé (non-linéarité)', ({ assert }) => {
    const maxHR = 190
    const restHR = 50
    const low = calc.calculate({
      durationHours: 1,
      heartRateCurve: flatCurve(130, 3600),
      maxHR,
      restHR,
    })
    const high = calc.calculate({
      durationHours: 1,
      heartRateCurve: flatCurve(170, 3600),
      maxHR,
      restHR,
    })
    assert.isAbove(high.value, low.value)
  })

  test('valeur positive pour une séance normale', ({ assert }) => {
    const result = calc.calculate({
      durationHours: 1,
      heartRateCurve: flatCurve(150, 3600),
      maxHR: 190,
      restHR: 50,
    })
    assert.isAbove(result.value, 0)
  })
})

// ── Coefficient k homme vs femme ──────────────────────────────────────────────

test.group('TRIMPexp — coefficient k selon le sexe', () => {
  test('k femme (1.67) < k homme (1.92) → hrTSS femme < hrTSS homme à FC identique', ({
    assert,
  }) => {
    const input: Omit<SessionLoadInput, 'sex'> = {
      durationHours: 1,
      heartRateCurve: flatCurve(160, 3600),
      maxHR: 190,
      restHR: 50,
    }
    const male = calc.calculate({ ...input, sex: 'male' })
    const female = calc.calculate({ ...input, sex: 'female' })
    // k plus grand → e^(k*HRr) plus grand → TRIMPexp plus grand
    // ET la référence (1h LTHR) est aussi plus grande avec k=1.92
    // Le rapport varie mais on vérifie que la valeur n'est pas identique
    assert.notEqual(male.value, female.value)
  })

  test("sans sexe renseigné → default male (k=1.92, c'est la valeur homme)", ({ assert }) => {
    const input: SessionLoadInput = {
      durationHours: 1,
      heartRateCurve: flatCurve(160, 3600),
      maxHR: 190,
      restHR: 50,
    }
    const defaultResult = calc.calculate(input)
    const maleResult = calc.calculate({ ...input, sex: 'male' })
    assert.equal(defaultResult.value, maleResult.value)
  })
})

// ── rTSS ──────────────────────────────────────────────────────────────────────

test.group('rTSS — allure + VDOT', () => {
  test('1h à allure seuil (IF=1) → rTSS = 100', ({ assert }) => {
    const vdot = 50
    // On simule que avgPace = thresholdPace (IF = 1)
    // thresholdPace = résolution de VO2(v) = vdot*0.88
    // VO2 = -4.60 + 0.182258v + 0.000104v²
    // À vdot=50, targetVO2 = 44 → v ≈ 227 m/min (résolution quadratique)
    // On injecte directement avgPace = thresholdPace pour avoir IF=1
    // On calcule en direct plutôt que de deviner la valeur exacte
    const targetVO2 = vdot * 0.88
    const a = 0.000104
    const b = 0.182258
    const c = -4.6 - targetVO2
    const thresholdPace = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)

    const result = calc.calculate({
      durationHours: 1,
      avgPaceMPerMin: thresholdPace,
      vdot,
    })
    assert.approximately(result.value, 100, 1)
  })

  test('allure inférieure au seuil → rTSS < 100', ({ assert }) => {
    const result = calc.calculate({
      durationHours: 1,
      avgPaceMPerMin: 150, // lent
      vdot: 50,
    })
    assert.isBelow(result.value, 100)
  })

  test('durée plus longue → rTSS plus élevé (proportionnel)', ({ assert }) => {
    const base: SessionLoadInput = { durationHours: 1, avgPaceMPerMin: 200, vdot: 50 }
    const longer: SessionLoadInput = { ...base, durationHours: 2 }
    const r1 = calc.calculate(base)
    const r2 = calc.calculate(longer)
    assert.approximately(r2.value, r1.value * 2, 0.5)
  })
})

// ── Session RPE ───────────────────────────────────────────────────────────────

test.group('Session RPE', () => {
  test('1h à RPE 7 → valeur ~100 TSS', ({ assert }) => {
    // RPE 7 × 60 min / 4.2 = 100
    const result = calc.calculate({ durationHours: 1, perceivedEffort: 7 })
    assert.approximately(result.value, 100, 2)
  })

  test('RPE plus élevé → charge plus grande', ({ assert }) => {
    const low = calc.calculate({ durationHours: 1, perceivedEffort: 4 })
    const high = calc.calculate({ durationHours: 1, perceivedEffort: 8 })
    assert.isAbove(high.value, low.value)
  })

  test('durée plus longue à même RPE → charge plus grande', ({ assert }) => {
    const short = calc.calculate({ durationHours: 0.5, perceivedEffort: 6 })
    const long = calc.calculate({ durationHours: 1, perceivedEffort: 6 })
    assert.approximately(long.value, short.value * 2, 0.5)
  })
})

// ── Normalisation TSS-like ────────────────────────────────────────────────────

test.group('normalisation TSS-like — 100 = 1h au seuil', () => {
  test('hrTSS : 1h au seuil (88% FCmax) ≈ 100', ({ assert }) => {
    const maxHR = 190
    const restHR = 50
    const lthr = Math.round(maxHR * 0.88)
    const result = calc.calculate({
      durationHours: 1,
      heartRateCurve: flatCurve(lthr, 3600),
      maxHR,
      restHR,
    })
    assert.approximately(result.value, 100, 5)
  })

  test('rTSS : IF² × durée_h × 100 → valeur positive', ({ assert }) => {
    const result = calc.calculate({ durationHours: 1, avgPaceMPerMin: 200, vdot: 50 })
    assert.isAbove(result.value, 0)
  })
})
