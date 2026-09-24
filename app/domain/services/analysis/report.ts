import type {
  AnalysisSession,
  EffortRecord,
  IntensityWeek,
} from '#domain/services/analysis/aggregations'
import type { Readiness, RecoveryPoint, WeakSignal } from '#domain/services/analysis/wellness'
import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { DailyWellness } from '#domain/value_objects/daily_wellness'
import { addDaysIso } from '#domain/services/calendar'

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  return h > 0 ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`
}

const DISTANCE_LABELS: Record<number, string> = {
  400: '400 m',
  1000: '1 km',
  1609: '1 mile',
  5000: '5 km',
  10000: '10 km',
  21097: 'semi',
  42195: 'marathon',
}

export type ClaudeSummaryInput = {
  asOf: string
  sessions: AnalysisSession[]
  fitness: FitnessProfile | null
  intensity: IntensityWeek[]
  records: EffortRecord[]
  recentRecords: EffortRecord[]
  vdot: number | null
  efficiency: { week: string; ef: number }[]
  recovery: RecoveryPoint[]
  readiness: Readiness
  signals: WeakSignal[]
  wellness: DailyWellness[]
}

/**
 * H1 · Bloc Markdown compact des indicateurs DÉRIVÉS (que la montre ne calcule
 * pas), à coller dans un projet Claude. Pas de données brutes : chiffres clés
 * et tendances uniquement.
 */
export function buildClaudeSummary(input: ClaudeSummaryInput): string {
  const weekAgo = addDaysIso(input.asOf, -7)
  const week = input.sessions.filter((s) => s.date > weekAgo && s.date <= input.asOf)
  const km = week.reduce((a, s) => a + (s.distanceKm ?? 0), 0)
  const minutes = week.reduce((a, s) => a + s.durationMinutes, 0)
  const tss = week.reduce((a, s) => a + (s.trainingLoad ?? 0), 0)
  const lastIntensity = input.intensity[input.intensity.length - 1]

  const lines: string[] = [
    `## Bilan d'entraînement Sporty — ${input.asOf}`,
    '',
    '### 7 derniers jours',
    `- ${week.length} séance(s), ${km.toFixed(1)} km, ${Math.floor(minutes / 60)} h ${minutes % 60} min, charge ${Math.round(tss)} TSS`,
  ]
  if (lastIntensity?.lowShare !== null && lastIntensity?.lowShare !== undefined) {
    lines.push(
      `- Répartition d'intensité : ${Math.round(lastIntensity.lowShare * 100)} % en Z1–Z2` +
        (lastIntensity.tooMuchZ3 ? ' (trop de Z3)' : '')
    )
  }

  if (input.fitness) {
    const f = input.fitness
    lines.push(
      '',
      '### Forme (modèle de Banister)',
      `- CTL (forme) ${Math.round(f.chronicTrainingLoad)}, ATL (fatigue) ${Math.round(f.acuteTrainingLoad)}, TSB (fraîcheur) ${Math.round(f.trainingStressBalance)}, ACWR ${f.acuteChronicWorkloadRatio.toFixed(2)}`
    )
  }

  if (input.vdot || input.records.length > 0) {
    lines.push('', '### Performance')
    if (input.vdot) lines.push(`- VDOT estimé (90 derniers jours) : ${input.vdot}`)
    for (const r of input.recentRecords) {
      lines.push(
        `- Meilleur ${DISTANCE_LABELS[r.distance]} récent : ${formatDuration(r.seconds)} (${r.date})`
      )
    }
  }

  if (input.efficiency.length >= 2) {
    const first = input.efficiency[0].ef
    const last = input.efficiency[input.efficiency.length - 1].ef
    const delta = Math.round(((last - first) / first) * 1000) / 10
    lines.push(
      '',
      '### Efficacité aérobie (sorties faciles)',
      `- EF ${last} (${delta >= 0 ? '+' : ''}${delta} % sur la période)`
    )
  }

  const lastRecovery = input.recovery[input.recovery.length - 1]
  const lastNight = input.wellness[input.wellness.length - 1]
  if (lastRecovery || lastNight) {
    lines.push('', '### Récupération')
    if (lastRecovery?.hrv7 !== null && lastRecovery?.hrv7 !== undefined) {
      lines.push(
        `- HRV (moy. 7 j) ${lastRecovery.hrv7} ms` +
          (lastRecovery.hrvBand
            ? ` — normale ${Math.round(lastRecovery.hrvBand.low)}–${Math.round(lastRecovery.hrvBand.high)} ms`
            : '')
      )
    }
    if (lastRecovery?.restingHr7 !== null && lastRecovery?.restingHr7 !== undefined)
      lines.push(`- FC repos (moy. 7 j) ${lastRecovery.restingHr7} bpm`)
    if (lastNight?.sleepMinutes !== null && lastNight?.sleepMinutes !== undefined) {
      lines.push(
        `- Dernière nuit : ${Math.floor(lastNight.sleepMinutes / 60)} h ${lastNight.sleepMinutes % 60} min`
      )
    }
    if (input.readiness.level !== 'unknown') {
      lines.push(`- Forme du jour : ${input.readiness.level} (score ${input.readiness.score})`)
    }
  }

  if (input.signals.length > 0) {
    lines.push('', '### Alertes', ...input.signals.map((s) => `- ${s}`))
  }

  return lines.join('\n')
}

// ── E4 · Corrélations ─────────────────────────────────────────────────────────

/** Paires (sommeil de la veille, efficacité de la séance du jour) pour un nuage de points */
export function sleepVsEfficiency(
  sessions: AnalysisSession[],
  wellness: DailyWellness[]
): { date: string; sleepMinutes: number; hrv: number | null; ef: number }[] {
  const byDate = new Map(wellness.map((d) => [d.date, d]))
  return sessions.flatMap((s) => {
    const night = byDate.get(s.date) // nuit rattachée au jour du réveil
    const ef = s.analysis?.efficiencyFactor
    if (!night?.sleepMinutes || !ef) return []
    return [{ date: s.date, sleepMinutes: night.sleepMinutes, hrv: night.hrvRmssd, ef }]
  })
}

/** Coefficient de corrélation de Pearson (null si moins de 5 points) */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 5) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  return dx > 0 && dy > 0 ? Math.round((num / Math.sqrt(dx * dy)) * 100) / 100 : null
}

// ── H4 · Export CSV ───────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : JSON.stringify(value)
  return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}

// ── H2 · Bilan de période ─────────────────────────────────────────────────────

export type PeriodTotals = {
  sessions: number
  distanceKm: number
  durationMinutes: number
  load: number
}

export function periodTotals(sessions: AnalysisSession[]): PeriodTotals {
  return {
    sessions: sessions.length,
    distanceKm: Math.round(sessions.reduce((a, s) => a + (s.distanceKm ?? 0), 0) * 10) / 10,
    durationMinutes: sessions.reduce((a, s) => a + s.durationMinutes, 0),
    load: Math.round(sessions.reduce((a, s) => a + (s.trainingLoad ?? 0), 0)),
  }
}

/** Meilleurs efforts de la période qui battent tout ce qui précède (nouveaux records) */
export function newRecords(period: EffortRecord[], before: EffortRecord[]): EffortRecord[] {
  const previous = new Map(before.map((r) => [r.distance, r.seconds]))
  return period.filter((r) => !previous.has(r.distance) || r.seconds < previous.get(r.distance)!)
}
