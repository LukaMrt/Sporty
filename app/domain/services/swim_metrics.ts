import type { SwimMetrics } from '#domain/value_objects/swim_metrics'

/** Champs natation saisis à la main (formulaire de séance) */
export function buildSwimInputMetrics(input: {
  subType?: string | null
  poolLengthM?: number | null
}): SwimMetrics {
  const metrics: SwimMetrics = {}
  if (input.subType === 'pool' || input.subType === 'open_water') metrics.subType = input.subType
  if (input.poolLengthM !== null && input.poolLengthM !== undefined) {
    metrics.poolLengthM = input.poolLengthM
  }
  return metrics
}
