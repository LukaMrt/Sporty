import type { FitnessDay } from '#domain/value_objects/fitness_profile'
import { addDaysIso, daysBetween, dayOfWeekIso } from '#domain/services/calendar'
import { loadContribution } from '#domain/services/sport_load_contribution'
import {
  predictTimeFromVdot,
  weekStart,
  type AnalysisSession,
} from '#domain/services/analysis/aggregations'

// ── Charge effective ──────────────────────────────────────────────────────────

/**
 * Remplace `trainingLoad` par la charge effective (celle du modèle de forme :
 * stockée ou recalculée, pondérée par sport). Sans charge connue pour une
 * séance, on retombe sur la charge stockée pondérée.
 */
export function withEffectiveLoads<
  T extends Pick<AnalysisSession, 'id' | 'sportSlug' | 'trainingLoad'>,
>(sessions: T[], loads: Map<number, number>): T[] {
  return sessions.map((s) => {
    const effective = loads.get(s.id)
    if (effective !== undefined) return { ...s, trainingLoad: Math.round(effective * 10) / 10 }
    if (s.trainingLoad === null) return s
    return { ...s, trainingLoad: s.trainingLoad * loadContribution(s.sportSlug) }
  })
}

// ── Périodes de comparaison ───────────────────────────────────────────────────

export type CompareMode = 'previous' | 'year' | 'none'

/** Période de même durée juste avant, ou mêmes dates un an plus tôt */
export function comparisonPeriod(
  from: string,
  to: string,
  mode: CompareMode
): { from: string; to: string } | null {
  if (mode === 'none') return null
  if (mode === 'year') return { from: addDaysIso(from, -365), to: addDaysIso(to, -365) }
  const span = daysBetween(from, to) + 1
  return { from: addDaysIso(from, -span), to: addDaysIso(from, -1) }
}

// ── Régularité ────────────────────────────────────────────────────────────────

export type Regularity = {
  /** Semaines (lundi → dimanche) couvertes par la période */
  weeks: number
  /** Semaines avec au moins une séance */
  activeWeeks: number
  /** Semaines actives consécutives jusqu'à maintenant (la semaine en cours ne casse pas la série) */
  currentStreak: number
  longestStreak: number
  /** Nombre de séances par jour de la semaine, lundi → dimanche */
  byWeekday: [number, number, number, number, number, number, number]
  sessionsPerWeek: number
}

export function regularity(sessions: AnalysisSession[], from: string, to: string): Regularity {
  const active = new Set(sessions.map((s) => weekStart(s.date)))
  const weeks: string[] = []
  for (let w = weekStart(from); w <= to; w = addDaysIso(w, 7)) weeks.push(w)

  let longestStreak = 0
  let run = 0
  for (const w of weeks) {
    run = active.has(w) ? run + 1 : 0
    longestStreak = Math.max(longestStreak, run)
  }

  let currentStreak = 0
  // La semaine en cours n'est pas finie : si elle est vide, la série continue depuis la précédente
  let i = weeks.length - 1
  if (i >= 0 && !active.has(weeks[i])) i--
  for (; i >= 0 && active.has(weeks[i]); i--) currentStreak++

  const byWeekday: Regularity['byWeekday'] = [0, 0, 0, 0, 0, 0, 0]
  for (const s of sessions) byWeekday[(dayOfWeekIso(s.date) + 6) % 7]++

  return {
    weeks: weeks.length,
    activeWeeks: weeks.filter((w) => active.has(w)).length,
    currentStreak,
    longestStreak,
    byWeekday,
    sessionsPerWeek: weeks.length > 0 ? Math.round((sessions.length / weeks.length) * 10) / 10 : 0,
  }
}

// ── Temps forts de la période ─────────────────────────────────────────────────

export type PeriodHighlights = {
  longest: Pick<
    AnalysisSession,
    'id' | 'date' | 'sportSlug' | 'durationMinutes' | 'distanceKm'
  > | null
  biggestWeek: { week: string; load: number; durationMinutes: number } | null
  mostActiveMonth: { month: string; durationMinutes: number; sessions: number } | null
}

export function periodHighlights(sessions: AnalysisSession[]): PeriodHighlights {
  // Plus longue séance : en durée, comparable entre sports
  const longest = sessions.reduce<AnalysisSession | null>(
    (best, s) => (!best || s.durationMinutes > best.durationMinutes ? s : best),
    null
  )

  const weeks = new Map<string, { load: number; durationMinutes: number }>()
  const months = new Map<string, { durationMinutes: number; sessions: number }>()
  for (const s of sessions) {
    const w = weeks.get(weekStart(s.date)) ?? { load: 0, durationMinutes: 0 }
    w.load += s.trainingLoad ?? 0
    w.durationMinutes += s.durationMinutes
    weeks.set(weekStart(s.date), w)
    const m = months.get(s.date.slice(0, 7)) ?? { durationMinutes: 0, sessions: 0 }
    m.durationMinutes += s.durationMinutes
    m.sessions++
    months.set(s.date.slice(0, 7), m)
  }
  const biggest = [...weeks.entries()].sort((a, b) => b[1].load - a[1].load)[0]
  const busiestMonth = [...months.entries()].sort(
    (a, b) => b[1].durationMinutes - a[1].durationMinutes
  )[0]

  return {
    longest: longest
      ? {
          id: longest.id,
          date: longest.date,
          sportSlug: longest.sportSlug,
          durationMinutes: longest.durationMinutes,
          distanceKm: longest.distanceKm,
        }
      : null,
    biggestWeek: biggest
      ? {
          week: biggest[0],
          load: Math.round(biggest[1].load),
          durationMinutes: biggest[1].durationMinutes,
        }
      : null,
    mostActiveMonth: busiestMonth ? { month: busiestMonth[0], ...busiestMonth[1] } : null,
  }
}

// ── Charge par sport ──────────────────────────────────────────────────────────

export function loadBySportByWeek(
  sessions: AnalysisSession[]
): { week: string; bySport: Record<string, number> }[] {
  const weeks = new Map<string, Record<string, number>>()
  for (const s of sessions) {
    if (!s.trainingLoad) continue
    const bySport = weeks.get(weekStart(s.date)) ?? {}
    bySport[s.sportSlug] = (bySport[s.sportSlug] ?? 0) + s.trainingLoad
    weeks.set(weekStart(s.date), bySport)
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, bySport]) => ({
      week,
      bySport: Object.fromEntries(
        Object.entries(bySport).map(([sport, load]) => [sport, Math.round(load)])
      ),
    }))
}

// ── Dynamique de la forme ─────────────────────────────────────────────────────

/** Ratio charge aiguë / chronique jour par jour (ATL / CTL) */
export function acwrSeries(days: FitnessDay[]): { date: string; acwr: number }[] {
  return days
    .filter((d) => d.ctl >= 1)
    .map((d) => ({ date: d.date, acwr: Math.round((d.atl / d.ctl) * 100) / 100 }))
}

/** Variation de CTL sur `days` jours (null si l'historique est trop court) */
export function ctlDelta(series: FitnessDay[], days: number): number | null {
  if (series.length <= days) return null
  const last = series[series.length - 1]
  const before = series[series.length - 1 - days]
  return Math.round((last.ctl - before.ctl) * 10) / 10
}

// ── Plan : réalisé vs prévu ───────────────────────────────────────────────────

export type PlannedLoad = { date: string; minutes: number; tss: number }

export type AdherenceWeek = {
  week: string
  plannedMinutes: number
  doneMinutes: number
  plannedLoad: number
  doneLoad: number
}

/** Volume et charge prévus vs réalisés, par semaine du plan écoulée */
export function planAdherence(
  planned: PlannedLoad[],
  sessions: AnalysisSession[],
  today: string
): AdherenceWeek[] {
  const thisWeek = weekStart(today)
  const weeks = new Map<string, AdherenceWeek>()
  for (const p of planned) {
    const week = weekStart(p.date)
    if (week > thisWeek) continue
    const w = weeks.get(week) ?? {
      week,
      plannedMinutes: 0,
      doneMinutes: 0,
      plannedLoad: 0,
      doneLoad: 0,
    }
    w.plannedMinutes += p.minutes
    w.plannedLoad += p.tss
    weeks.set(week, w)
  }
  for (const s of sessions) {
    const w = weeks.get(weekStart(s.date))
    if (!w) continue
    w.doneMinutes += s.durationMinutes
    w.doneLoad += s.trainingLoad ?? 0
  }
  return [...weeks.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({
      ...w,
      plannedLoad: Math.round(w.plannedLoad),
      doneLoad: Math.round(w.doneLoad),
    }))
}

// ── Objectif ──────────────────────────────────────────────────────────────────

export type GoalOutlook = {
  distanceKm: number
  targetSeconds: number | null
  eventDate: string | null
  /** Jours restants (null sans date ou date passée) */
  daysLeft: number | null
  /** Temps prédit par le VDOT actuel */
  predictedSeconds: number | null
  /** Prédit − visé (négatif = en avance sur l'objectif) */
  gapSeconds: number | null
  /** Forme projetée le jour J avec les séances du plan */
  raceDay: { ctl: number; tsb: number } | null
}

export function goalOutlook(input: {
  goal: { targetDistanceKm: number; targetTimeMinutes: number | null; eventDate: string | null }
  vdot: number | null
  today: string
  projection: FitnessDay[]
}): GoalOutlook {
  const { goal, vdot, today, projection } = input
  const targetSeconds =
    goal.targetTimeMinutes !== null ? Math.round(goal.targetTimeMinutes * 60) : null
  const predictedSeconds = vdot ? predictTimeFromVdot(vdot, goal.targetDistanceKm * 1000) : null
  const daysLeft =
    goal.eventDate && goal.eventDate >= today ? daysBetween(today, goal.eventDate) : null
  const raceDay = goal.eventDate ? projection.find((d) => d.date === goal.eventDate) : undefined
  return {
    distanceKm: goal.targetDistanceKm,
    targetSeconds,
    eventDate: goal.eventDate,
    daysLeft,
    predictedSeconds,
    gapSeconds:
      predictedSeconds !== null && targetSeconds !== null ? predictedSeconds - targetSeconds : null,
    raceDay: raceDay ? { ctl: raceDay.ctl, tsb: raceDay.tsb } : null,
  }
}

// ── Charge vs récupération ────────────────────────────────────────────────────

/**
 * Charge de la veille face à l'HRV du matin : une grosse journée est
 * normalement suivie d'une HRV plus basse ; si elle ne remonte pas, la
 * récupération est incomplète.
 */
export function loadVsHrv(
  series: FitnessDay[],
  recovery: { date: string; hrv: number | null }[]
): { date: string; hrv: number; previousLoad: number }[] {
  const tssByDate = new Map(series.map((d) => [d.date, d.tss]))
  return recovery.flatMap((p) =>
    p.hrv === null
      ? []
      : [{ date: p.date, hrv: p.hrv, previousLoad: tssByDate.get(addDaysIso(p.date, -1)) ?? 0 }]
  )
}

// ── Semaine en cours (dashboard) ──────────────────────────────────────────────

export type WeekSession = Pick<
  AnalysisSession,
  'id' | 'date' | 'sportSlug' | 'durationMinutes' | 'distanceKm' | 'trainingLoad'
>

export type WeekPlanned = {
  date: string
  sessionType: string
  minutes: number
  tss: number
  intensityZone: string
  status: string
}

export type CurrentWeek = {
  from: string
  days: { date: string; sessions: WeekSession[]; planned: WeekPlanned[] }[]
  doneMinutes: number
  doneLoad: number
  /** Prévu par le plan sur la semaine (null sans plan) */
  plannedMinutes: number | null
  plannedLoad: number | null
  /** Durée hebdo moyenne des 4 semaines précédentes (null sans historique) */
  typicalMinutes: number | null
}

export function currentWeek(
  today: string,
  sessions: WeekSession[],
  planned: WeekPlanned[] | null
): CurrentWeek {
  const from = weekStart(today)
  const to = addDaysIso(from, 6)
  const thisWeek = sessions.filter((s) => s.date >= from && s.date <= to)
  const weekPlanned = planned?.filter((p) => p.date >= from && p.date <= to) ?? null

  const previous = [1, 2, 3, 4].map((w) => {
    const start = addDaysIso(from, -7 * w)
    const end = addDaysIso(start, 6)
    return sessions
      .filter((s) => s.date >= start && s.date <= end)
      .reduce((a, s) => a + s.durationMinutes, 0)
  })
  const hasHistory = sessions.some((s) => s.date < from)

  return {
    from,
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDaysIso(from, i)
      return {
        date,
        sessions: thisWeek.filter((s) => s.date === date),
        planned: weekPlanned?.filter((p) => p.date === date) ?? [],
      }
    }),
    doneMinutes: thisWeek.reduce((a, s) => a + s.durationMinutes, 0),
    doneLoad: Math.round(thisWeek.reduce((a, s) => a + (s.trainingLoad ?? 0), 0)),
    plannedMinutes: weekPlanned ? weekPlanned.reduce((a, p) => a + p.minutes, 0) : null,
    plannedLoad: weekPlanned ? Math.round(weekPlanned.reduce((a, p) => a + p.tss, 0)) : null,
    typicalMinutes: hasHistory ? Math.round(previous.reduce((a, b) => a + b, 0) / 4) : null,
  }
}
