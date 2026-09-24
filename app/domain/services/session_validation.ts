import { InvalidSessionMetricsError } from '#domain/errors/invalid_session_metrics_error'

/**
 * Cohérence des FC saisies : FC min ≤ FC moyenne ≤ FC max.
 * Lève `InvalidSessionMetricsError` sur le premier champ fautif.
 */
export function assertHeartRateConsistency(input: {
  minHeartRate?: number | null
  avgHeartRate?: number | null
  maxHeartRate?: number | null
}): void {
  const { minHeartRate: min, avgHeartRate: avg, maxHeartRate: max } = input
  if (min && avg && min > avg) throw new InvalidSessionMetricsError('min_heart_rate', 'hr_order')
  if (avg && max && avg > max) throw new InvalidSessionMetricsError('max_heart_rate', 'hr_order')
  if (min && max && min > max) throw new InvalidSessionMetricsError('max_heart_rate', 'hr_order')
}
