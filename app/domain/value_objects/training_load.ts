export type TrainingLoadMethod = 'trimp_exp' | 'rtss' | 'rpe'

export interface TrainingLoad {
  value: number
  method: TrainingLoadMethod
}
