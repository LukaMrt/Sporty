import {
  IntensityZone,
  PlannedSessionStatus,
  SessionType,
} from '#domain/value_objects/planning_types'
import type {
  IntervalBlock,
  NewPlannedSession,
  PlannedSession,
  StrengthExercise,
} from '#domain/entities/planned_session'
import type { PlannedWeek } from '#domain/entities/planned_week'
import type { TrainingPlan } from '#domain/entities/training_plan'
import type { TrainingGoal } from '#domain/entities/training_goal'
import { estimatePlannedTss } from '#domain/services/planned_load'
import { dayOfWeekIso } from '#domain/services/calendar'

/**
 * Document de plan : format JSON échangé avec Claude (import, export, révision).
 *
 * Volontairement explicite et stable (champs en snake_case, énumérations en
 * anglais) : c'est un contrat avec un LLM, décrit mot pour mot dans le prompt
 * (`plan_prompt.ts`). Toute évolution incompatible passe par `version`.
 */

export const PLAN_DOCUMENT_VERSION = 1

export const DAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
export type DayName = (typeof DAY_NAMES)[number]

export const SESSION_TYPES = Object.values(SessionType)
export const ZONES = Object.values(IntensityZone)
export const BLOCK_TYPES = ['warmup', 'work', 'recovery', 'cooldown'] as const
export const RECOVERY_TYPES = ['jog', 'rest'] as const

export type PlanDocBlock = {
  type: (typeof BLOCK_TYPES)[number]
  repeat?: number
  duration_minutes?: number | null
  distance_m?: number | null
  zone?: IntensityZone | null
  pace_per_km?: string | null
  power_watts?: number | null
  recovery_minutes?: number | null
  recovery_type?: (typeof RECOVERY_TYPES)[number] | null
  notes?: string | null
}

export type PlanDocExercise = {
  name: string
  sets?: number | null
  reps?: string | number | null
  load?: string | null
  rest_seconds?: number | null
  notes?: string | null
}

export type PlanDocSession = {
  day: DayName
  sport: string
  type: SessionType
  title?: string | null
  duration_minutes: number
  distance_km?: number | null
  zone?: IntensityZone | null
  pace_per_km?: string | null
  pace_per_100m?: string | null
  power_watts?: number | null
  rpe?: number | null
  description?: string | null
  blocks?: PlanDocBlock[] | null
  exercises?: PlanDocExercise[] | null
  /** Export uniquement : séance déjà réalisée (ignorée à l'import en mode merge) */
  done?: boolean
}

export type PlanDocWeek = {
  week: number
  phase?: string | null
  recovery_week?: boolean
  notes?: string | null
  sessions: PlanDocSession[]
}

export type PlanDocGoal = {
  distance_km: number
  /** « H:MM:SS » ou « MM:SS » */
  target_time?: string | null
  event_date?: string | null
}

export type PlanDocument = {
  version: typeof PLAN_DOCUMENT_VERSION
  /** replace : nouveau plan complet ; merge : met à jour les semaines listées du plan actif */
  mode: 'replace' | 'merge'
  plan: {
    name?: string | null
    /** Lundi de la semaine 1 (obligatoire en mode replace) */
    start_date?: string | null
    notes?: string | null
    goal?: PlanDocGoal | null
  }
  weeks: PlanDocWeek[]
  /** merge : semaines à supprimer (numéros) */
  delete_weeks?: number[]
}

export type PlanDocError = {
  /** Chemin JSON de l'erreur (« weeks[2].sessions[0].type ») */
  path: string
  code:
    | 'invalid_json'
    | 'required'
    | 'invalid_type'
    | 'invalid_value'
    | 'invalid_date'
    | 'not_monday'
    | 'invalid_pace'
    | 'invalid_time'
    | 'out_of_range'
    | 'duplicate_week'
    | 'empty'
    | 'unsupported_version'
  /** Valeurs attendues (énumérations, bornes) */
  expected?: string
}

export type PlanDocParseResult =
  { ok: true; document: PlanDocument } | { ok: false; errors: PlanDocError[] }

// ── Validation ────────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const PACE = /^\d{1,2}:[0-5]\d$/
const TIME = /^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isValidDate = (v: string) => ISO_DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))

/** Claude entoure souvent le JSON d'un bloc de code Markdown ou d'une phrase */
export function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  if (fenced) return fenced[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text.trim()
}

class Validator {
  errors: PlanDocError[] = []

  fail(path: string, code: PlanDocError['code'], expected?: string) {
    this.errors.push({ path, code, ...(expected ? { expected } : {}) })
  }

  /** Nombre (ou null si facultatif) dans [min, max] */
  number(
    o: Obj,
    key: string,
    path: string,
    opts: { required?: boolean; min?: number; max?: number; integer?: boolean } = {}
  ) {
    const v = o[key]
    if (v === undefined || v === null) {
      if (opts.required) this.fail(`${path}.${key}`, 'required')
      return null
    }
    if (typeof v !== 'number' || !Number.isFinite(v) || (opts.integer && !Number.isInteger(v))) {
      this.fail(`${path}.${key}`, 'invalid_type', opts.integer ? 'integer' : 'number')
      return null
    }
    if ((opts.min !== undefined && v < opts.min) || (opts.max !== undefined && v > opts.max)) {
      this.fail(`${path}.${key}`, 'out_of_range', `${opts.min ?? '−∞'}–${opts.max ?? '∞'}`)
      return null
    }
    return v
  }

  string(o: Obj, key: string, path: string, opts: { required?: boolean; max?: number } = {}) {
    const v = o[key]
    if (v === undefined || v === null || v === '') {
      if (opts.required) this.fail(`${path}.${key}`, 'required')
      return null
    }
    if (typeof v !== 'string') {
      this.fail(`${path}.${key}`, 'invalid_type', 'string')
      return null
    }
    return opts.max ? v.slice(0, opts.max) : v
  }

  enumValue<T extends string>(
    o: Obj,
    key: string,
    path: string,
    values: readonly T[],
    required = false
  ): T | null {
    const v = o[key]
    if (v === undefined || v === null) {
      if (required) this.fail(`${path}.${key}`, 'required', values.join(', '))
      return null
    }
    const normalized = typeof v === 'string' ? v.trim().toLowerCase() : v
    if (!values.includes(normalized as T)) {
      this.fail(`${path}.${key}`, 'invalid_value', values.join(', '))
      return null
    }
    return normalized as T
  }

  pattern(
    o: Obj,
    key: string,
    path: string,
    regex: RegExp,
    code: 'invalid_pace' | 'invalid_time',
    expected: string
  ) {
    const v = this.string(o, key, path)
    if (v !== null && !regex.test(v.trim())) {
      this.fail(`${path}.${key}`, code, expected)
      return null
    }
    return v?.trim() ?? null
  }

  date(o: Obj, key: string, path: string, required = false) {
    const v = this.string(o, key, path, { required })
    if (v !== null && !isValidDate(v)) {
      this.fail(`${path}.${key}`, 'invalid_date', 'YYYY-MM-DD')
      return null
    }
    return v
  }
}

function validateBlock(v: Validator, raw: unknown, path: string): PlanDocBlock | null {
  if (!isObj(raw)) {
    v.fail(path, 'invalid_type', 'object')
    return null
  }
  const type = v.enumValue(raw, 'type', path, BLOCK_TYPES, true)
  const block: PlanDocBlock = {
    type: type ?? 'work',
    repeat: v.number(raw, 'repeat', path, { min: 1, max: 100, integer: true }) ?? 1,
    duration_minutes: v.number(raw, 'duration_minutes', path, { min: 0.05, max: 600 }),
    distance_m: v.number(raw, 'distance_m', path, { min: 1, max: 100_000 }),
    zone: v.enumValue(raw, 'zone', path, ZONES),
    pace_per_km: v.pattern(raw, 'pace_per_km', path, PACE, 'invalid_pace', 'M:SS'),
    power_watts: v.number(raw, 'power_watts', path, { min: 1, max: 2000, integer: true }),
    recovery_minutes: v.number(raw, 'recovery_minutes', path, { min: 0, max: 60 }),
    recovery_type: v.enumValue(raw, 'recovery_type', path, RECOVERY_TYPES),
    notes: v.string(raw, 'notes', path, { max: 500 }),
  }
  if (block.duration_minutes === null && block.distance_m === null) {
    v.fail(`${path}.duration_minutes`, 'required', 'duration_minutes ou distance_m')
  }
  return type ? block : null
}

function validateExercise(v: Validator, raw: unknown, path: string): PlanDocExercise | null {
  if (!isObj(raw)) {
    v.fail(path, 'invalid_type', 'object')
    return null
  }
  const name = v.string(raw, 'name', path, { required: true, max: 120 })
  const reps = raw.reps
  if (reps !== undefined && reps !== null && typeof reps !== 'string' && typeof reps !== 'number') {
    v.fail(`${path}.reps`, 'invalid_type', 'string | number')
  }
  return name
    ? {
        name,
        sets: v.number(raw, 'sets', path, { min: 1, max: 50, integer: true }),
        reps: typeof reps === 'number' || typeof reps === 'string' ? String(reps) : null,
        load: v.string(raw, 'load', path, { max: 60 }),
        rest_seconds: v.number(raw, 'rest_seconds', path, { min: 0, max: 1800, integer: true }),
        notes: v.string(raw, 'notes', path, { max: 300 }),
      }
    : null
}

function validateSession(
  v: Validator,
  raw: unknown,
  path: string,
  sports: readonly string[]
): PlanDocSession | null {
  if (!isObj(raw)) {
    v.fail(path, 'invalid_type', 'object')
    return null
  }
  const day = v.enumValue(raw, 'day', path, DAY_NAMES, true)
  const sport = v.enumValue(raw, 'sport', path, sports, true)
  const type = v.enumValue(raw, 'type', path, SESSION_TYPES, true)
  const duration = v.number(raw, 'duration_minutes', path, { required: true, min: 1, max: 1440 })
  const list = <T>(key: string, fn: (item: unknown, p: string) => T | null): T[] | null => {
    const value = raw[key]
    if (value === undefined || value === null) return null
    if (!Array.isArray(value)) {
      v.fail(`${path}.${key}`, 'invalid_type', 'array')
      return null
    }
    return value.flatMap((item, i) => {
      const parsed = fn(item, `${path}.${key}[${i}]`)
      return parsed ? [parsed] : []
    })
  }
  const session: PlanDocSession = {
    day: day ?? 'monday',
    sport: sport ?? 'running',
    type: type ?? SessionType.Easy,
    title: v.string(raw, 'title', path, { max: 200 }),
    duration_minutes: duration ?? 1,
    distance_km: v.number(raw, 'distance_km', path, { min: 0.01, max: 1000 }),
    zone: v.enumValue(raw, 'zone', path, ZONES),
    pace_per_km: v.pattern(raw, 'pace_per_km', path, PACE, 'invalid_pace', 'M:SS'),
    pace_per_100m: v.pattern(raw, 'pace_per_100m', path, PACE, 'invalid_pace', 'M:SS'),
    power_watts: v.number(raw, 'power_watts', path, { min: 1, max: 2000, integer: true }),
    rpe: v.number(raw, 'rpe', path, { min: 1, max: 10, integer: true }),
    description: v.string(raw, 'description', path, { max: 5000 }),
    blocks: list('blocks', (item, p) => validateBlock(v, item, p)),
    exercises: list('exercises', (item, p) => validateExercise(v, item, p)),
    ...(raw.done === true ? { done: true } : {}),
  }
  return day && sport && type && duration !== null ? session : null
}

/**
 * Valide un document de plan (texte brut collé depuis Claude). `sports` : slugs
 * acceptés pour `sport`. Toutes les erreurs sont remontées d'un coup, avec leur
 * chemin, pour pouvoir être renvoyées telles quelles à Claude.
 */
export function parsePlanDocument(text: string, sports: readonly string[]): PlanDocParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(extractJson(text))
  } catch {
    return { ok: false, errors: [{ path: '$', code: 'invalid_json' }] }
  }
  const v = new Validator()
  if (!isObj(raw))
    return { ok: false, errors: [{ path: '$', code: 'invalid_type', expected: 'object' }] }

  if (raw.version !== undefined && raw.version !== PLAN_DOCUMENT_VERSION) {
    v.fail('version', 'unsupported_version', String(PLAN_DOCUMENT_VERSION))
  }
  const mode = v.enumValue(raw, 'mode', '$', ['replace', 'merge'] as const) ?? 'replace'
  const planRaw = isObj(raw.plan) ? raw.plan : {}
  if (raw.plan !== undefined && !isObj(raw.plan)) v.fail('plan', 'invalid_type', 'object')

  const startDate = v.date(planRaw, 'start_date', 'plan', mode === 'replace')
  if (startDate && dayOfWeekIso(startDate) !== 1) v.fail('plan.start_date', 'not_monday')

  let goal: PlanDocGoal | null = null
  if (isObj(planRaw.goal)) {
    const distance = v.number(planRaw.goal, 'distance_km', 'plan.goal', {
      required: true,
      min: 0.1,
      max: 1000,
    })
    goal = distance
      ? {
          distance_km: distance,
          target_time: v.pattern(
            planRaw.goal,
            'target_time',
            'plan.goal',
            TIME,
            'invalid_time',
            'H:MM:SS'
          ),
          event_date: v.date(planRaw.goal, 'event_date', 'plan.goal'),
        }
      : null
  } else if (planRaw.goal !== undefined && planRaw.goal !== null) {
    v.fail('plan.goal', 'invalid_type', 'object | null')
  }

  const weeks: PlanDocWeek[] = []
  if (!Array.isArray(raw.weeks)) {
    v.fail('weeks', raw.weeks === undefined ? 'required' : 'invalid_type', 'array')
  } else {
    const seen = new Set<number>()
    raw.weeks.forEach((weekRaw: unknown, i: number) => {
      const path = `weeks[${i}]`
      if (!isObj(weekRaw)) return v.fail(path, 'invalid_type', 'object')
      const number = v.number(weekRaw, 'week', path, {
        required: true,
        min: 1,
        max: 104,
        integer: true,
      })
      if (number !== null && seen.has(number)) v.fail(`${path}.week`, 'duplicate_week')
      if (number !== null) seen.add(number)
      const sessionsRaw = weekRaw.sessions
      if (sessionsRaw !== undefined && !Array.isArray(sessionsRaw)) {
        v.fail(`${path}.sessions`, 'invalid_type', 'array')
      }
      const recovery = weekRaw.recovery_week
      if (recovery !== undefined && typeof recovery !== 'boolean') {
        v.fail(`${path}.recovery_week`, 'invalid_type', 'boolean')
      }
      weeks.push({
        week: number ?? i + 1,
        phase: v.string(weekRaw, 'phase', path, { max: 60 }),
        recovery_week: recovery === true,
        notes: v.string(weekRaw, 'notes', path, { max: 2000 }),
        sessions: (Array.isArray(sessionsRaw) ? sessionsRaw : []).flatMap((s, j) => {
          const parsed = validateSession(v, s, `${path}.sessions[${j}]`, sports)
          return parsed ? [parsed] : []
        }),
      })
    })
    if (raw.weeks.length === 0 && mode === 'replace') v.fail('weeks', 'empty')
    // En mode replace, les semaines doivent se suivre à partir de 1
    if (mode === 'replace' && weeks.length > 0) {
      const numbers = [...seen].sort((a, b) => a - b)
      if (numbers.some((n, i) => n !== i + 1))
        v.fail('weeks', 'invalid_value', '1, 2, 3… sans trou')
    }
  }

  const deleteWeeks = raw.delete_weeks
  let toDelete: number[] | undefined
  if (deleteWeeks !== undefined) {
    if (
      !Array.isArray(deleteWeeks) ||
      deleteWeeks.some((n) => !Number.isInteger(n) || (n as number) < 1)
    ) {
      v.fail('delete_weeks', 'invalid_type', 'integer[]')
    } else toDelete = deleteWeeks as number[]
  }

  if (v.errors.length > 0) return { ok: false, errors: v.errors }
  return {
    ok: true,
    document: {
      version: PLAN_DOCUMENT_VERSION,
      mode,
      plan: {
        name: v.string(planRaw, 'name', 'plan', { max: 200 }),
        start_date: startDate,
        notes: v.string(planRaw, 'notes', 'plan', { max: 5000 }),
        goal,
      },
      weeks,
      ...(toDelete ? { delete_weeks: toDelete } : {}),
    },
  }
}

// ── Conversions ───────────────────────────────────────────────────────────────

/** Nom du jour → convention JS (0 = dimanche), utilisée par `planned_sessions.day_of_week` */
export function dayNameToDow(day: DayName): number {
  return (DAY_NAMES.indexOf(day) + 1) % 7
}

export function dowToDayName(dow: number): DayName {
  return DAY_NAMES[(dow + 6) % 7]
}

/** « 1:45:00 » → 105 minutes */
export function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]]
  return h * 60 + m + s / 60
}

export function minutesToTime(minutes: number): string {
  const total = Math.round(minutes * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function blockToInterval(block: PlanDocBlock, fallbackZone: IntensityZone): IntervalBlock {
  return {
    type: block.type,
    durationMinutes: block.duration_minutes ?? null,
    distanceMeters: block.distance_m ?? null,
    targetPace: block.pace_per_km ?? null,
    intensityZone: block.zone ?? fallbackZone,
    repetitions: block.repeat ?? 1,
    recoveryDurationMinutes: block.recovery_minutes ?? null,
    recoveryType: block.recovery_type ?? null,
    targetPowerWatts: block.power_watts ?? null,
    notes: block.notes ?? null,
  }
}

function exerciseToEntity(exercise: PlanDocExercise): StrengthExercise {
  return {
    name: exercise.name,
    sets: exercise.sets ?? null,
    reps: exercise.reps === undefined || exercise.reps === null ? null : String(exercise.reps),
    load: exercise.load ?? null,
    restSeconds: exercise.rest_seconds ?? null,
    notes: exercise.notes ?? null,
  }
}

/** Zone par défaut d'un type de séance quand le document n'en donne pas */
const DEFAULT_ZONE: Partial<Record<SessionType, IntensityZone>> = {
  [SessionType.Recovery]: IntensityZone.Z1,
  [SessionType.Tempo]: IntensityZone.Z3,
  [SessionType.MarathonPace]: IntensityZone.Z3,
  [SessionType.Interval]: IntensityZone.Z4,
  [SessionType.Repetition]: IntensityZone.Z5,
  [SessionType.Race]: IntensityZone.Z4,
  [SessionType.Mobility]: IntensityZone.Z1,
  [SessionType.Rest]: IntensityZone.Z1,
}

/** Séance du document → séance planifiée (sans plan ni semaine) */
export function documentSessionToEntity(
  session: PlanDocSession,
  orderInDay: number
): Omit<NewPlannedSession, 'planId' | 'weekNumber'> {
  const zone = session.zone ?? DEFAULT_ZONE[session.type] ?? IntensityZone.Z2
  const base = {
    dayOfWeek: dayNameToDow(session.day),
    sessionType: session.type,
    sportSlug: session.sport,
    title: session.title ?? null,
    description: session.description ?? '',
    targetDurationMinutes: Math.round(session.duration_minutes),
    targetDistanceKm: session.distance_km ?? null,
    targetPacePerKm: session.pace_per_km ?? null,
    targetPacePer100m: session.pace_per_100m ?? null,
    targetPowerWatts: session.power_watts ?? null,
    targetRpe: session.rpe ?? null,
    intensityZone: zone,
    intervals: session.blocks?.length ? session.blocks.map((b) => blockToInterval(b, zone)) : null,
    exercises: session.exercises?.length ? session.exercises.map(exerciseToEntity) : null,
    orderInDay,
    completedSessionId: null,
    status: PlannedSessionStatus.Pending,
  }
  return { ...base, targetLoadTss: estimatePlannedTss(base) }
}

/** Ordre de chaque séance dans sa journée (position dans le document) */
export function sessionsWithOrder(week: PlanDocWeek) {
  const perDay = new Map<DayName, number>()
  return week.sessions.map((session) => {
    const order = perDay.get(session.day) ?? 0
    perDay.set(session.day, order + 1)
    return documentSessionToEntity(session, order)
  })
}

const clean = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
    )
  ) as T

/** Plan courant → document (export, révision par Claude) */
export function planToDocument(input: {
  plan: TrainingPlan
  goal: TrainingGoal | null
  weeks: PlannedWeek[]
  sessions: PlannedSession[]
  mode?: PlanDocument['mode']
}): PlanDocument {
  const { plan, goal, weeks, sessions } = input
  return {
    version: PLAN_DOCUMENT_VERSION,
    mode: input.mode ?? 'replace',
    plan: clean({
      name: plan.name,
      start_date: plan.startDate,
      notes: plan.notes,
      goal: goal
        ? clean({
            distance_km: goal.targetDistanceKm,
            target_time:
              goal.targetTimeMinutes !== null ? minutesToTime(goal.targetTimeMinutes) : null,
            event_date: goal.eventDate,
          })
        : null,
    }),
    weeks: weeks.map((week) =>
      clean({
        week: week.weekNumber,
        phase: week.phaseLabel || null,
        recovery_week: week.isRecoveryWeek || undefined,
        notes: week.notes,
        sessions: sessions
          .filter((s) => s.weekNumber === week.weekNumber && s.sessionType !== SessionType.Rest)
          .sort(
            (a, b) =>
              DAY_NAMES.indexOf(dowToDayName(a.dayOfWeek)) -
                DAY_NAMES.indexOf(dowToDayName(b.dayOfWeek)) || a.orderInDay - b.orderInDay
          )
          .map((s) =>
            clean({
              day: dowToDayName(s.dayOfWeek),
              sport: s.sportSlug,
              type: s.sessionType,
              title: s.title,
              duration_minutes: s.targetDurationMinutes,
              distance_km: s.targetDistanceKm,
              zone: s.intensityZone,
              pace_per_km: s.targetPacePerKm,
              pace_per_100m: s.targetPacePer100m,
              power_watts: s.targetPowerWatts,
              rpe: s.targetRpe,
              description: s.description,
              blocks: s.intervals?.map((b) =>
                clean({
                  type: b.type,
                  repeat: b.repetitions > 1 ? b.repetitions : null,
                  duration_minutes: b.durationMinutes,
                  distance_m: b.distanceMeters,
                  zone: b.intensityZone,
                  pace_per_km: b.targetPace,
                  power_watts: b.targetPowerWatts ?? null,
                  recovery_minutes: b.recoveryDurationMinutes,
                  recovery_type: b.recoveryType,
                  notes: b.notes ?? null,
                })
              ),
              exercises: s.exercises?.map((e) =>
                clean({
                  name: e.name,
                  sets: e.sets,
                  reps: e.reps,
                  load: e.load,
                  rest_seconds: e.restSeconds,
                  notes: e.notes,
                })
              ),
              // Séance déjà faite : Claude doit la garder telle quelle
              ...(s.status === PlannedSessionStatus.Completed ? { done: true } : {}),
            })
          ) as PlanDocSession[],
      })
    ),
  }
}
