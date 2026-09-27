import vine from '@vinejs/vine'
import { IntensityZone, SessionType } from '#domain/value_objects/planning_types'

const PACE = /^\d{1,2}:[0-5]\d$/

const interval = vine.object({
  type: vine.enum(['warmup', 'work', 'recovery', 'cooldown'] as const),
  durationMinutes: vine.number().min(0.05).max(600).nullable(),
  distanceMeters: vine.number().min(1).max(100_000).nullable(),
  targetPace: vine.string().regex(PACE).nullable(),
  intensityZone: vine.enum(Object.values(IntensityZone)),
  repetitions: vine.number().withoutDecimals().min(1).max(100),
  recoveryDurationMinutes: vine.number().min(0).max(60).nullable(),
  recoveryType: vine.enum(['jog', 'rest'] as const).nullable(),
  targetPowerWatts: vine.number().withoutDecimals().min(1).max(2000).nullable().optional(),
  notes: vine.string().trim().maxLength(500).nullable().optional(),
})

const exercise = vine.object({
  name: vine.string().trim().minLength(1).maxLength(120),
  sets: vine.number().withoutDecimals().min(1).max(50).nullable(),
  reps: vine.string().trim().maxLength(30).nullable(),
  load: vine.string().trim().maxLength(60).nullable(),
  restSeconds: vine.number().withoutDecimals().min(0).max(1800).nullable(),
  notes: vine.string().trim().maxLength(300).nullable(),
})

/** Champs d'une séance planifiée (camelCase : le formulaire envoie l'entité telle quelle) */
const sessionFields = {
  dayOfWeek: vine.number().withoutDecimals().min(0).max(6),
  sportSlug: vine.string().regex(/^[a-z_]{1,40}$/),
  sessionType: vine.enum(Object.values(SessionType)),
  title: vine.string().trim().maxLength(200).nullable(),
  description: vine.string().trim().maxLength(5000),
  targetDurationMinutes: vine.number().withoutDecimals().min(1).max(1440),
  targetDistanceKm: vine.number().min(0.01).max(1000).nullable(),
  intensityZone: vine.enum(Object.values(IntensityZone)),
  targetPacePerKm: vine.string().regex(PACE).nullable(),
  targetPacePer100m: vine.string().regex(PACE).nullable(),
  targetPowerWatts: vine.number().withoutDecimals().min(1).max(2000).nullable(),
  targetRpe: vine.number().withoutDecimals().min(1).max(10).nullable(),
  intervals: vine.array(interval).maxLength(30).nullable(),
  exercises: vine.array(exercise).maxLength(40).nullable(),
}

export const plannedSessionValidator = vine.create(vine.object(sessionFields))

export const importPlanValidator = vine.create(
  vine.object({
    document: vine.string().trim().minLength(2).maxLength(500_000),
  })
)

export const planPromptValidator = vine.create(
  vine.object({
    mode: vine.enum(['create', 'revise'] as const).optional(),
  })
)

export const planInfoValidator = vine.create(
  vine.object({
    name: vine.string().trim().maxLength(200).nullable().optional(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
  })
)

export const addWeekValidator = vine.create(
  vine.object({
    phaseLabel: vine.string().trim().maxLength(60).nullable().optional(),
    notes: vine.string().trim().maxLength(2000).nullable().optional(),
    isRecoveryWeek: vine.boolean().optional(),
    copyFromWeek: vine.number().withoutDecimals().min(1).nullable().optional(),
  })
)

export const updateWeekValidator = vine.create(
  vine.object({
    phaseLabel: vine.string().trim().maxLength(60).optional(),
    notes: vine.string().trim().maxLength(2000).nullable().optional(),
    isRecoveryWeek: vine.boolean().optional(),
  })
)
