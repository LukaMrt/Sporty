export type TrainingLoadMethod = 'trimp_exp' | 'rtss' | 'stss' | 'rpe'

export type TrainingLoad = {
  value: number
  method: TrainingLoadMethod
}
