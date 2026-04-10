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

    // Index des TSS par date ISO pour lookup rapide
    const tssByDate = new Map<string, number>()
    for (const entry of sorted) {
      const existing = tssByDate.get(entry.date) ?? 0
      tssByDate.set(entry.date, existing + entry.load.value)
    }

    // Itérer jour par jour du premier au dernier jour (jours manquants = TSS 0)
    // L'EMA Banister suppose une entrée quotidienne pour que CTL/ATL décroissent les jours de repos
    const startDate = new Date(sorted[0].date)
    const endDate = new Date(sorted[sorted.length - 1].date)

    let ctl = 0
    let atl = 0

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      const tss = tssByDate.get(dateStr) ?? 0
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
