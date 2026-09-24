import { inject } from '@adonisjs/core'
import { ImportedPlanRepository } from '#domain/interfaces/imported_plan_repository'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { parseImportedPlan, type PlanParseResult } from '#domain/services/plan_import_parser'
import { addDaysIso, todayInTimezone } from '#domain/services/calendar'
import { weekStart } from '#domain/services/analysis/aggregations'

export interface PlanDay {
  date: string
  planned: {
    id: number
    title: string
    targetDurationMinutes: number | null
    targetDistanceKm: number | null
    notes: string | null
  }[]
  done: { id: number; sportSlug: string; durationMinutes: number; distanceKm: number | null }[]
  status: 'done' | 'missed' | 'upcoming' | 'extra' | 'rest'
}

/** H3 · Plan importé (Claude) affiché face aux séances réalisées */
@inject()
export default class ImportedPlan {
  constructor(
    private plans: ImportedPlanRepository,
    private sessions: SessionRepository,
    private profiles: UserProfileRepository
  ) {}

  async import(userId: number, text: string): Promise<PlanParseResult> {
    const result = parseImportedPlan(text)
    if (result.ok) await this.plans.replaceRange(userId, result.entries)
    return result
  }

  async clear(userId: number): Promise<void> {
    await this.plans.clear(userId)
  }

  /** Semaines de `weeksBefore` avant à `weeksAfter` après la semaine courante */
  async calendar(userId: number, weeksBefore = 2, weeksAfter = 4) {
    const profile = await this.profiles.findByUserId(userId)
    const today = todayInTimezone(profile?.timezone)
    const from = addDaysIso(weekStart(today), -7 * weeksBefore)
    const to = addDaysIso(weekStart(today), 7 * (weeksAfter + 1) - 1)
    const [planned, done] = await Promise.all([
      this.plans.findRange(userId, from, to),
      this.sessions.findAnalysisEntries(userId, from, to),
    ])

    const days: PlanDay[] = []
    for (let date = from; date <= to; date = addDaysIso(date, 1)) {
      const p = planned.filter((e) => e.date === date)
      const d = done
        .filter((s) => s.date === date)
        .map((s) => ({
          id: s.id,
          sportSlug: s.sportSlug,
          durationMinutes: s.durationMinutes,
          distanceKm: s.distanceKm,
        }))
      const status: PlanDay['status'] =
        p.length > 0
          ? d.length > 0
            ? 'done'
            : date < today
              ? 'missed'
              : 'upcoming'
          : d.length > 0
            ? 'extra'
            : 'rest'
      days.push({ date, planned: p, done: d, status })
    }

    const past = days.filter((day) => day.date < today && day.planned.length > 0)
    return {
      today,
      days,
      hasPlan: planned.length > 0,
      adherence:
        past.length > 0
          ? Math.round((past.filter((d) => d.status === 'done').length / past.length) * 100)
          : null,
    }
  }
}
