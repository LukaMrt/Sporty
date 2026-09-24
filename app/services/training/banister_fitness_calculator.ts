import { FitnessProfileCalculator } from '#domain/interfaces/fitness_profile_calculator'
import type { LoadHistory } from '#domain/interfaces/fitness_profile_calculator'
import type { FitnessProfile, FitnessDay } from '#domain/value_objects/fitness_profile'

// ── Constantes Banister (1975, 1991) ──────────────────────────────────────────

const TAU_CTL = 42 // Chronic Training Load — fenêtre longue (fitness)
const TAU_ATL = 7 // Acute Training Load — fenêtre courte (fatigue)

const round1 = (v: number) => Math.round(v * 10) / 10

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── BanisterFitnessCalculator ─────────────────────────────────────────────────

export class BanisterFitnessCalculator extends FitnessProfileCalculator {
  calculate(loadHistory: LoadHistory, asOf?: string): FitnessProfile {
    const days = this.series(loadHistory, asOf)
    const last = days[days.length - 1]
    if (!last) {
      return {
        chronicTrainingLoad: 0,
        acuteTrainingLoad: 0,
        trainingStressBalance: 0,
        acuteChronicWorkloadRatio: 0,
        calculatedAt: new Date(),
      }
    }
    return {
      chronicTrainingLoad: last.ctl,
      acuteTrainingLoad: last.atl,
      trainingStressBalance: last.tsb,
      acuteChronicWorkloadRatio: last.ctl > 0 ? Math.round((last.atl / last.ctl) * 1000) / 1000 : 0,
      calculatedAt: new Date(),
    }
  }

  series(loadHistory: LoadHistory, asOf: string = todayUtc()): FitnessDay[] {
    if (loadHistory.length === 0) return []

    // TSS cumulés par jour
    const tssByDate = new Map<string, number>()
    for (const entry of loadHistory) {
      tssByDate.set(entry.date, (tssByDate.get(entry.date) ?? 0) + entry.load.value)
    }
    const firstDate = [...tssByDate.keys()].sort()[0]
    if (firstDate > asOf) return []

    // Amorçage : partir de 0 sous-estime la forme pendant le premier mois.
    // On initialise CTL (resp. ATL) à la charge quotidienne moyenne des 42 (resp. 7)
    // premiers jours d'historique.
    const meanDaily = (span: number) => {
      let sum = 0
      for (let i = 0; i < span; i++) sum += tssByDate.get(addDays(firstDate, i)) ?? 0
      return sum / span
    }
    let ctl = meanDaily(TAU_CTL)
    let atl = meanDaily(TAU_ATL)

    // Itération jour par jour jusqu'à `asOf` (jours sans séance = TSS 0) :
    // c'est ce qui fait décroître la fatigue les jours de repos.
    const days: FitnessDay[] = []
    for (let date = firstDate; date <= asOf; date = addDays(date, 1)) {
      const tss = tssByDate.get(date) ?? 0
      ctl = ctl + (tss - ctl) / TAU_CTL
      atl = atl + (tss - atl) / TAU_ATL
      days.push({
        date,
        tss: round1(tss),
        ctl: round1(ctl),
        atl: round1(atl),
        tsb: round1(ctl - atl),
      })
    }
    return days
  }
}
