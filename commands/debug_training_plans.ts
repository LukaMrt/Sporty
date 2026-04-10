import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

interface PlanRow {
  id: number
  user_id: number
  goal_id: number | null
  methodology: string
  plan_type: string
  status: string
  vdot_at_creation: number
  current_vdot: number
  sessions_per_week: number
  preferred_days: string
  start_date: string
  end_date: string
  auto_recalibrate: boolean
}

interface GoalRow {
  id: number
  target_distance_km: number
  target_time_minutes: number | null
  event_date: string | null
  status: string
}

interface WeekRow {
  id: number
  plan_id: number
  week_number: number
  phase_name: string
  phase_label: string
  is_recovery_week: boolean
  target_volume_minutes: number
}

interface IntervalBlock {
  type: string
  durationMinutes: number | null
  distanceMeters: number | null
  targetPace: string | null
  intensityZone: string
  repetitions: number
  recoveryDurationMinutes: number | null
  recoveryType: string | null
}

interface SessionRow {
  id: number
  plan_id: number
  week_number: number
  day_of_week: number
  session_type: string
  target_duration_minutes: number
  target_distance_km: number | null
  target_pace_per_km: string | null
  intensity_zone: string
  intervals: string | null
  target_load_tss: number | null
  status: string
}

export default class DebugTrainingPlans extends BaseCommand {
  static commandName = 'plan:debug'
  static description = 'Affiche toutes les infos des plans et leurs séances pour analyse LLM'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const db = await this.app.container.make('lucid.db')

    const plans = (await db.from('training_plans').select('*')) as PlanRow[]
    if (plans.length === 0) {
      this.logger.warning('Aucun plan trouvé en base.')
      return
    }

    const planIds = plans.map((p) => p.id)
    const goalIds = plans.map((p) => p.goal_id).filter((id): id is number => id !== null)

    const [weeks, sessions, goals] = await Promise.all([
      db.from('planned_weeks').whereIn('plan_id', planIds).select('*') as Promise<WeekRow[]>,
      db.from('planned_sessions').whereIn('plan_id', planIds).select('*') as Promise<SessionRow[]>,
      goalIds.length > 0
        ? (db.from('training_goals').whereIn('id', goalIds).select('*') as Promise<GoalRow[]>)
        : Promise.resolve([] as GoalRow[]),
    ])

    const weeksByPlan = this.groupWeeks(weeks)
    const sessionsByPlan = this.groupSessions(sessions)
    const goalsById = new Map(goals.map((g) => [g.id, g]))

    this.logger.info(`${plans.length} plan(s) trouvé(s)\n`)

    for (const plan of plans) {
      this.printPlan(
        plan,
        plan.goal_id !== null ? goalsById.get(plan.goal_id) : undefined,
        weeksByPlan.get(plan.id) ?? [],
        sessionsByPlan.get(plan.id) ?? []
      )
    }
  }

  private groupWeeks(rows: WeekRow[]): Map<number, WeekRow[]> {
    return this.groupById(rows, (r) => r.plan_id)
  }

  private groupSessions(rows: SessionRow[]): Map<number, SessionRow[]> {
    return this.groupById(rows, (r) => r.plan_id)
  }

  private groupById<T>(rows: T[], key: (r: T) => number): Map<number, T[]> {
    const result = new Map<number, T[]>()
    for (const row of rows) {
      const k = key(row)
      const existing = result.get(k) ?? []
      existing.push(row)
      result.set(k, existing)
    }
    return result
  }

  private log(msg: string) {
    this.logger.info(msg)
  }

  private printPlan(
    plan: PlanRow,
    goal: GoalRow | undefined,
    weeks: WeekRow[],
    sessions: SessionRow[]
  ) {
    this.logger.info('═══════════════════════════════════════════════════════')
    this.logger.info(`PLAN #${plan.id}`)
    this.logger.info('═══════════════════════════════════════════════════════')

    this.log(`  userId          : ${plan.user_id}`)
    this.log(`  methodology     : ${plan.methodology}`)
    this.log(`  level (type)    : ${plan.plan_type}`)
    this.log(`  status          : ${plan.status}`)
    this.log(`  vdotAtCreation  : ${plan.vdot_at_creation}`)
    this.log(`  currentVdot     : ${plan.current_vdot}`)
    this.log(`  sessionsPerWeek : ${plan.sessions_per_week}`)
    this.log(`  preferredDays   : ${plan.preferred_days}`)
    this.log(`  startDate       : ${plan.start_date}`)
    this.log(`  endDate         : ${plan.end_date}`)
    this.log(`  autoRecalibrate : ${plan.auto_recalibrate}`)

    if (goal) {
      this.log('\n  --- OBJECTIF ---')
      this.log(`  goalId          : ${goal.id}`)
      this.log(`  targetDistanceKm: ${goal.target_distance_km} km`)
      this.log(
        `  targetTime      : ${goal.target_time_minutes !== null ? String(goal.target_time_minutes) + ' min' : 'non défini'}`
      )
      this.log(`  eventDate       : ${goal.event_date ?? 'non définie'}`)
      this.log(`  goalStatus      : ${goal.status}`)
    } else {
      this.log("  (pas d'objectif lié)")
    }

    const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number)
    this.log(`\n  --- SEMAINES (${sortedWeeks.length}) ---`)
    for (const week of sortedWeeks) {
      const recovery = week.is_recovery_week ? ' [RÉCUPÉRATION]' : ''
      this.log(
        `  S${String(week.week_number).padStart(2, '0')}${recovery} | phase: ${week.phase_name} (${week.phase_label}) | volume: ${week.target_volume_minutes} min`
      )
    }

    const sorted = [...sessions].sort((a, b) =>
      a.week_number !== b.week_number
        ? a.week_number - b.week_number
        : a.day_of_week - b.day_of_week
    )
    this.log(`\n  --- SÉANCES PLANIFIÉES (${sorted.length}) ---`)

    for (const s of sorted) {
      const pace = s.target_pace_per_km ? ` | pace: ${s.target_pace_per_km}/km` : ''
      const dist = s.target_distance_km !== null ? ` | ${s.target_distance_km} km` : ''
      const tss = s.target_load_tss !== null ? ` | TSS: ${s.target_load_tss}` : ''
      const rawIntervals: IntervalBlock[] | null =
        typeof s.intervals === 'string' ? (JSON.parse(s.intervals) as IntervalBlock[]) : null
      const intervalsLabel = rawIntervals ? ` | ${rawIntervals.length} blocs` : ''
      this.log(
        `  S${String(s.week_number).padStart(2, '0')} J${s.day_of_week} | ${s.session_type.padEnd(20)} | ${s.intensity_zone.padEnd(12)} | ${s.target_duration_minutes} min${dist}${pace}${tss}${intervalsLabel} | ${s.status}`
      )

      if (rawIntervals && rawIntervals.length > 0) {
        for (const block of rawIntervals) {
          const rep = block.repetitions > 1 ? `${block.repetitions}x ` : ''
          const dur = block.durationMinutes !== null ? `${block.durationMinutes}min` : ''
          const blockDist = block.distanceMeters !== null ? `${block.distanceMeters}m` : ''
          const blockPace = block.targetPace ? ` @${block.targetPace}` : ''
          const recov =
            block.recoveryDurationMinutes !== null
              ? ` | récup: ${block.recoveryDurationMinutes}min ${block.recoveryType ?? ''}`
              : ''
          this.log(
            `       ${rep}[${block.type}] ${dur}${blockDist}${blockPace} (${block.intensityZone})${recov}`
          )
        }
      }
    }

    this.log('')
  }
}
