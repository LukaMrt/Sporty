export enum TrainingMethodology {
  Polarized = 'polarized',
  Pyramidal = 'pyramidal',
  Threshold = 'threshold',
  Daniels = 'daniels',
}

export enum BiologicalSex {
  Male = 'male',
  Female = 'female',
}

export enum TrainingState {
  Idle = 'idle',
  InPlan = 'in_plan',
  Preparation = 'preparation',
  Transition = 'transition',
  Maintenance = 'maintenance',
}

export enum PlanType {
  Marathon = 'marathon',
  HalfMarathon = 'half_marathon',
  TenKm = '10km',
  FiveKm = '5km',
  Custom = 'custom',
}

export enum PlanStatus {
  Draft = 'draft',
  Active = 'active',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

export enum SessionType {
  Easy = 'easy',
  LongRun = 'long_run',
  Tempo = 'tempo',
  MarathonPace = 'marathon_pace',
  Interval = 'interval',
  Repetition = 'repetition',
  Recovery = 'recovery',
  Race = 'race',
  CrossTraining = 'cross_training',
  Rest = 'rest',
}

export enum IntensityZone {
  Z1 = 'z1',
  Z2 = 'z2',
  Z3 = 'z3',
  Z4 = 'z4',
  Z5 = 'z5',
}

export enum PlannedSessionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Skipped = 'skipped',
}

export enum IntervalBlockType {
  Warmup = 'warmup',
  Work = 'work',
  Recovery = 'recovery',
  Cooldown = 'cooldown',
}

export enum LoadMethod {
  HeartRate = 'heart_rate',
  Pace = 'pace',
  Power = 'power',
  Rpe = 'rpe',
}

/**
 * Types de séance considérés comme « qualité » (bilans hebdomadaires,
 * report de séance manquée, détection sous-cible). Inclut l'allure marathon,
 * centrale dans les phases TQ/FQ des plans semi/marathon.
 */
export const QUALITY_SESSION_TYPES: readonly SessionType[] = [
  SessionType.Tempo,
  SessionType.Interval,
  SessionType.Repetition,
  SessionType.MarathonPace,
]

/** Ratio volume maintenance / volume pic (Daniels : 30-40 %). */
export const MAINTENANCE_VOLUME_RATIO = 0.35
