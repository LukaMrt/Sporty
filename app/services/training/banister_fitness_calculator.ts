import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { TrainingLoad } from '#domain/value_objects/training_load'

// ── Constantes Banister (1975, 1991) ──────────────────────────────────────────

const TAU_CTL = 42 // Chronic Training Load — fenêtre longue (fitness)
const TAU_ATL = 7 // Acute Training Load — fenêtre courte (fatigue)

// ── BanisterFitnessCalculator ─────────────────────────────────────────────────

export class BanisterFitnessCalculator extends FitnessProfileCalculator {
  calculate(loadHistory: { date: string; load: TrainingLoad }[]): FitnessProfile {
    if (loadHistory.length === 0) {
      return {
        chronicTrainingLoad: 0,
        acuteTrainingLoad: 0,
        trainingStressBalance: 0,
        acuteChronicWorkloadRatio: 0,
        calculatedAt: new Date(),
      }
    }

    // Tri chronologique — garantit la cohérence de l'EMA
    const sorted = [...loadHistory].sort((a, b) => a.date.localeCompare(b.date))

    let ctl = 0
    let atl = 0

    for (const entry of sorted) {
      const tss = entry.load.value
      ctl = ctl + (tss - ctl) / TAU_CTL
      atl = atl + (tss - atl) / TAU_ATL
    }

    const tsb = ctl - atl
    const acwr = ctl > 0 ? atl / ctl : 0

    return {
      chronicTrainingLoad: Math.round(ctl * 10) / 10,
      acuteTrainingLoad: Math.round(atl * 10) / 10,
      trainingStressBalance: Math.round(tsb * 10) / 10,
      acuteChronicWorkloadRatio: Math.round(acwr * 1000) / 1000,
      calculatedAt: new Date(),
    }
  }
}
