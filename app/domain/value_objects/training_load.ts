export type TrainingLoadMethod = 'trimp_exp' | 'rtss' | 'rpe'

export type TrainingLoad = {
  value: number
  method: TrainingLoadMethod
}
