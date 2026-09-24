export type FitnessProfile = {
  chronicTrainingLoad: number
  acuteTrainingLoad: number
  trainingStressBalance: number
  acuteChronicWorkloadRatio: number
  calculatedAt: Date
}

/** Un point du graphique de forme (Performance Management Chart) */
export type FitnessDay = {
  date: string
  /** Charge du jour (somme des TSS) */
  tss: number
  ctl: number
  atl: number
  tsb: number
}
