import type { FitnessDay, FitnessProfile } from '#domain/value_objects/fitness_profile'
import type {
  EffortRecord,
  IntensityWeek,
  MonotonyWeek,
} from '#domain/services/analysis/aggregations'
import type { Readiness, WeakSignal } from '#domain/services/analysis/wellness'
import type { PeriodTotals } from '#domain/services/analysis/report'
import type { GoalOutlook, Regularity } from '#domain/services/analysis/overview'
import { ctlDelta } from '#domain/services/analysis/overview'

/**
 * Moteur d'enseignements : transforme les indicateurs en constats courts,
 * classés par importance. Le domaine ne produit que des identifiants et des
 * paramètres ; la phrase est rédigée par l'interface (`analysis.insights.<id>`).
 */

export type InsightTone = 'alert' | 'warning' | 'positive' | 'neutral'

export type InsightSection =
  'load' | 'volume' | 'intensity' | 'performance' | 'efficiency' | 'recovery' | 'swimming' | 'goal'

export type Insight = {
  id: string
  section: InsightSection
  tone: InsightTone
  /** Plus haut = plus important */
  priority: number
  params: Record<string, number | string>
}

export type InsightsInput = {
  fitness: FitnessProfile | null
  /** Série quotidienne de forme, jusqu'à aujourd'hui */
  series: FitnessDay[]
  monotony: MonotonyWeek[]
  totals: PeriodTotals
  comparison: PeriodTotals | null
  intensity: IntensityWeek[]
  efficiency: { week: string; ef: number }[]
  decoupling: { decoupling: number }[]
  /** Records battus pendant la période */
  newRecords: EffortRecord[]
  vdotHistory: { month: string; vdot: number }[]
  readiness: Readiness
  hrvLowStreak: number
  signals: WeakSignal[]
  regularity: Regularity
  swimPace: { pacePer100m: number }[]
  goal: GoalOutlook | null
}

const BASE_PRIORITY: Record<InsightTone, number> = {
  alert: 100,
  warning: 70,
  positive: 50,
  neutral: 20,
}

/** Seuils de lecture (repères usuels, expliqués dans l'aide) */
export const THRESHOLDS = {
  /** Hausse de CTL en 7 j au-delà de laquelle le risque de blessure augmente */
  rampPerWeek: 8,
  acwrHigh: 1.3,
  acwrDanger: 1.5,
  acwrLow: 0.8,
  tsbFresh: 5,
  tsbProductive: -10,
  tsbOverreached: -30,
  monotony: 2,
  lowIntensityShare: 0.75,
  decoupling: 5,
} as const

function pct(from: number, to: number): number {
  return Math.round(((to - from) / from) * 1000) / 10
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function buildInsights(input: InsightsInput): Insight[] {
  const out: Insight[] = []
  const add = (
    section: InsightSection,
    id: string,
    tone: InsightTone,
    params: Insight['params'] = {},
    bonus = 0
  ) => out.push({ id, section, tone, priority: BASE_PRIORITY[tone] + bonus, params })

  // ── Charge et forme
  const f = input.fitness
  if (f && f.chronicTrainingLoad > 0) {
    const delta28 = ctlDelta(input.series, 28)
    if (delta28 !== null) {
      if (delta28 >= 3) add('load', 'fitnessRising', 'positive', { delta: delta28 }, 5)
      else if (delta28 <= -5) add('load', 'fitnessFalling', 'neutral', { delta: delta28 }, 5)
      else add('load', 'fitnessStable', 'neutral', { ctl: Math.round(f.chronicTrainingLoad) })
    }
    const ramp = ctlDelta(input.series, 7)
    if (ramp !== null && ramp > THRESHOLDS.rampPerWeek) {
      add('load', 'rampTooFast', 'warning', { ramp })
    }

    const tsb = Math.round(f.trainingStressBalance)
    if (tsb < THRESHOLDS.tsbOverreached) add('load', 'overreached', 'alert', { tsb })
    else if (tsb <= THRESHOLDS.tsbProductive) add('load', 'productive', 'positive', { tsb })
    else if (tsb > THRESHOLDS.tsbFresh) add('load', 'fresh', 'positive', { tsb }, -5)
    else add('load', 'balanced', 'neutral', { tsb })

    const acwr = Math.round(f.acuteChronicWorkloadRatio * 100) / 100
    if (acwr > THRESHOLDS.acwrDanger) add('load', 'acwrDanger', 'alert', { acwr })
    else if (acwr > THRESHOLDS.acwrHigh) add('load', 'acwrHigh', 'warning', { acwr })
    else if (acwr < THRESHOLDS.acwrLow && f.chronicTrainingLoad >= 10) {
      add('load', 'acwrLow', 'neutral', { acwr })
    }
  }
  const lastMonotony = input.monotony.at(-1)?.monotony
  if (lastMonotony && lastMonotony > THRESHOLDS.monotony) {
    add('load', 'monotonyHigh', 'warning', { monotony: lastMonotony })
  }

  // ── Volume et régularité
  if (input.comparison && input.comparison.durationMinutes > 0) {
    const change = pct(input.comparison.durationMinutes, input.totals.durationMinutes)
    if (change >= 15) add('volume', 'volumeUp', 'neutral', { percent: change }, 3)
    else if (change <= -15) add('volume', 'volumeDown', 'neutral', { percent: Math.abs(change) }, 3)
    else add('volume', 'volumeSteady', 'neutral', { percent: change })
  }
  const reg = input.regularity
  if (reg.currentStreak >= 4) {
    add('volume', 'streak', 'positive', { weeks: reg.currentStreak })
  } else if (reg.weeks >= 4 && reg.activeWeeks / reg.weeks < 0.6) {
    add('volume', 'irregular', 'warning', { active: reg.activeWeeks, weeks: reg.weeks })
  }

  // ── Intensité (4 dernières semaines avec cardio)
  const recent = input.intensity.slice(-4).filter((w) => w.lowShare !== null)
  if (recent.length > 0) {
    const low = mean(recent.map((w) => w.lowShare!))
    const percent = Math.round(low * 100)
    if (low >= THRESHOLDS.lowIntensityShare) add('intensity', 'polarized', 'positive', { percent })
    else add('intensity', 'tooGrey', 'warning', { percent })
  }

  // ── Efficacité aérobie (moyenne des 2 premières vs 2 dernières semaines)
  if (input.efficiency.length >= 4) {
    const first = mean(input.efficiency.slice(0, 2).map((e) => e.ef))
    const last = mean(input.efficiency.slice(-2).map((e) => e.ef))
    const change = pct(first, last)
    if (change >= 3) add('efficiency', 'efficiencyUp', 'positive', { percent: change }, 5)
    else if (change <= -3)
      add('efficiency', 'efficiencyDown', 'warning', { percent: Math.abs(change) })
    else add('efficiency', 'efficiencyStable', 'neutral', { percent: change })
  }
  if (input.decoupling.length > 0) {
    const avg = Math.round(mean(input.decoupling.slice(-3).map((d) => d.decoupling)) * 10) / 10
    if (avg < THRESHOLDS.decoupling)
      add('efficiency', 'decouplingGood', 'positive', { percent: avg })
    else add('efficiency', 'decouplingHigh', 'neutral', { percent: avg })
  }

  // ── Performance
  if (input.newRecords.length > 0) {
    const best = input.newRecords.at(-1)! // distances triées croissantes : la plus longue
    add(
      'performance',
      'newRecord',
      'positive',
      { distance: best.distance, time: best.seconds, count: input.newRecords.length },
      10
    )
  }
  if (input.vdotHistory.length >= 2) {
    const from = input.vdotHistory[0].vdot
    const to = input.vdotHistory.at(-1)!.vdot
    if (to - from >= 1) add('performance', 'vdotUp', 'positive', { from, to })
    else if (from - to >= 1) add('performance', 'vdotDown', 'neutral', { from, to })
  }

  // ── Objectif
  const goal = input.goal
  if (goal?.gapSeconds !== null && goal?.gapSeconds !== undefined) {
    if (goal.gapSeconds <= 0) add('goal', 'goalOnTrack', 'positive', { gap: -goal.gapSeconds }, 8)
    else add('goal', 'goalGap', 'neutral', { gap: goal.gapSeconds }, 8)
  }
  if (goal?.raceDay && goal.raceDay.tsb < THRESHOLDS.tsbProductive) {
    add('goal', 'raceDayTired', 'warning', { tsb: Math.round(goal.raceDay.tsb) })
  }

  // ── Récupération
  for (const signal of input.signals) add('recovery', 'weakSignal', 'alert', { signal }, 5)
  if (input.hrvLowStreak >= 3) add('recovery', 'hrvLow', 'warning', { days: input.hrvLowStreak }, 5)
  if (input.readiness.level === 'low') add('recovery', 'readinessLow', 'alert')
  else if (input.readiness.level === 'good') add('recovery', 'readinessGood', 'positive')

  // ── Natation (allure : plus bas = plus rapide)
  if (input.swimPace.length >= 2) {
    const change = pct(input.swimPace[0].pacePer100m, input.swimPace.at(-1)!.pacePer100m)
    if (change <= -2) add('swimming', 'swimFaster', 'positive', { percent: Math.abs(change) })
    else if (change >= 2) add('swimming', 'swimSlower', 'neutral', { percent: change })
  }

  // Tri stable : priorité décroissante, ordre d'apparition sinon
  return out
    .map((insight, index) => ({ insight, index }))
    .sort((a, b) => b.insight.priority - a.insight.priority || a.index - b.index)
    .map(({ insight }) => insight)
}

// ── Conseil du jour (accueil) ─────────────────────────────────────────────────

export type DailyAdvice = 'recover' | 'quality' | 'absorb' | 'steady'

/**
 * Conseil du jour à partir de la fraîcheur (TSB) et de la forme du jour
 * (récupération mesurée par la montre). La récupération mesurée prime : un
 * TSB flatteur ne compense pas une nuit ou une HRV mauvaises.
 */
export function dailyAdvice(
  tsb: number | null,
  readiness: Readiness['level'],
  signals: WeakSignal[] = []
): DailyAdvice | null {
  if (signals.length > 0 || readiness === 'low') return 'recover'
  if (tsb === null) return readiness === 'good' ? 'quality' : null
  if (tsb < THRESHOLDS.tsbOverreached) return 'recover'
  if (tsb > THRESHOLDS.tsbFresh) return readiness === 'moderate' ? 'steady' : 'quality'
  if (tsb <= THRESHOLDS.tsbProductive) return 'absorb'
  return 'steady'
}
