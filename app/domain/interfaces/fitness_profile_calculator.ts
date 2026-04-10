import type { FitnessProfile } from '#domain/value_objects/fitness_profile'
import type { TrainingLoad } from '#domain/value_objects/training_load'

export abstract class FitnessProfileCalculator {
  abstract calculate(loadHistory: { date: string; load: TrainingLoad }[]): FitnessProfile
}
