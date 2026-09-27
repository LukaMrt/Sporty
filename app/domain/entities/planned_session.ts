import type {
  SessionType,
  IntensityZone,
  PlannedSessionStatus,
} from '#domain/value_objects/planning_types'

export type { SessionType, IntensityZone, PlannedSessionStatus }

export type IntervalBlock = {
  type: 'warmup' | 'work' | 'recovery' | 'cooldown'
  durationMinutes: number | null
  distanceMeters: number | null
  targetPace: string | null
  intensityZone: IntensityZone
  repetitions: number
  recoveryDurationMinutes: number | null
  recoveryType: 'jog' | 'rest' | null
  /** Puissance cible (vélo), en watts */
  targetPowerWatts?: number | null
  /** Consigne libre du bloc (« relâché », « 50 m jambes »…) */
  notes?: string | null
}

/** Exercice d'une séance de renforcement */
export type StrengthExercise = {
  name: string
  sets: number | null
  /** « 10 », « 8-12 », « 30 s »… */
  reps: string | null
  /** « 20 kg », « poids du corps »… */
  load: string | null
  restSeconds: number | null
  notes: string | null
}

export type PlannedSession = {
  id: number
  planId: number
  weekNumber: number
  dayOfWeek: number
  sessionType: SessionType
  /** Sport de la séance (slug de la table `sports`) */
  sportSlug: string
  /** Titre libre (« 10 × 400 m », « Renfo haut du corps ») */
  title: string | null
  /** Consignes détaillées */
  description: string
  targetDurationMinutes: number
  targetDistanceKm: number | null
  targetPacePerKm: string | null
  /** Allure natation cible (MM:SS aux 100 m) */
  targetPacePer100m: string | null
  targetPowerWatts: number | null
  /** Effort perçu cible (1-10) */
  targetRpe: number | null
  exercises: StrengthExercise[] | null
  /** Ordre parmi les séances du même jour */
  orderInDay: number
  intensityZone: IntensityZone
  intervals: IntervalBlock[] | null
  targetLoadTss: number | null
  completedSessionId: number | null
  status: PlannedSessionStatus
  createdAt: string
  updatedAt: string
}

/** Champs ajoutés pour les plans multisports : facultatifs à la création */
type SessionExtras = Pick<
  PlannedSession,
  | 'sportSlug'
  | 'title'
  | 'description'
  | 'targetPacePer100m'
  | 'targetPowerWatts'
  | 'targetRpe'
  | 'exercises'
  | 'orderInDay'
>

export type NewPlannedSession = Omit<
  PlannedSession,
  'id' | 'createdAt' | 'updatedAt' | keyof SessionExtras
> &
  Partial<SessionExtras>

/** Valeurs par défaut : séance de course, sans consignes particulières */
export const SESSION_EXTRAS_DEFAULTS: SessionExtras = {
  sportSlug: 'running',
  title: null,
  description: '',
  targetPacePer100m: null,
  targetPowerWatts: null,
  targetRpe: null,
  exercises: null,
  orderInDay: 0,
}

/** Champs d'une séance modifiables par l'athlète (création, édition) */
export type PlannedSessionFields = Pick<
  PlannedSession,
  | 'dayOfWeek'
  | 'sportSlug'
  | 'sessionType'
  | 'title'
  | 'description'
  | 'targetDurationMinutes'
  | 'targetDistanceKm'
  | 'intensityZone'
  | 'targetPacePerKm'
  | 'targetPacePer100m'
  | 'targetPowerWatts'
  | 'targetRpe'
  | 'intervals'
  | 'exercises'
>
