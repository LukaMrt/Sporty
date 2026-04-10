import type { SessionLoadInput } from '#domain/value_objects/session_load_input'
import type { TrainingLoad } from '#domain/value_objects/training_load'

export abstract class TrainingLoadCalculator {
  abstract calculate(input: SessionLoadInput): TrainingLoad
}
