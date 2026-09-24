import type { FitnessProfile, FitnessDay } from '#domain/value_objects/fitness_profile'
import type { TrainingLoad } from '#domain/value_objects/training_load'

export type LoadHistory = { date: string; load: TrainingLoad }[]

export abstract class FitnessProfileCalculator {
  /**
   * État de forme à la date `asOf` (YYYY-MM-DD, défaut : aujourd'hui en UTC).
   * Les jours sans séance après la dernière séance font décroître CTL/ATL.
   */
  abstract calculate(loadHistory: LoadHistory, asOf?: string): FitnessProfile

  /** Série quotidienne CTL/ATL/TSB de la première séance jusqu'à `asOf` */
  abstract series(loadHistory: LoadHistory, asOf?: string): FitnessDay[]
}
