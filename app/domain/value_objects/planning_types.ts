export enum TrainingMethodology {
  Polarized = 'polarized',
  Pyramidal = 'pyramidal',
  Threshold = 'threshold',
}

export enum BiologicalSex {
  Male = 'male',
  Female = 'female',
}

export enum TrainingState {
  Idle = 'idle',
  InPlan = 'in_plan',
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

export enum GoalStatus {
  Active = 'active',
  Achieved = 'achieved',
  Missed = 'missed',
}

export enum SessionType {
  Easy = 'easy',
  Tempo = 'tempo',
  Interval = 'interval',
  Long = 'long',
  Rest = 'rest',
  Other = 'other',
}

export enum IntensityZone {
  Z1 = 'z1',
  Z2 = 'z2',
  Z3 = 'z3',
  Z4 = 'z4',
  Z5 = 'z5',
}

export enum PlannedSessionStatus {
  Planned = 'planned',
  Completed = 'completed',
  Skipped = 'skipped',
  Missed = 'missed',
}

export enum IntervalBlockType {
  Work = 'work',
  Recovery = 'recovery',
}

export enum LoadMethod {
  HeartRate = 'heart_rate',
  Pace = 'pace',
  Power = 'power',
  Rpe = 'rpe',
}
