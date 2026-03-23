import type { RunMetrics } from '#domain/value_objects/run_metrics'

export type SportMetrics = RunMetrics | Record<string, unknown>

export function isRunMetrics(metrics: SportMetrics): metrics is RunMetrics {
  return (
    metrics !== null &&
    typeof metrics === 'object' &&
    ('splits' in metrics || 'heartRateCurve' in metrics || 'avgPacePerKm' in metrics)
  )
}
