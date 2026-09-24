/** Métriques de séance incohérentes (ex. FC min > FC moyenne) */
export class InvalidSessionMetricsError extends Error {
  readonly i18nKey: string

  constructor(
    readonly field: string,
    reason: 'hr_order' | 'elevation_negative'
  ) {
    super(`Invalid session metrics: ${field} (${reason})`)
    this.name = 'InvalidSessionMetricsError'
    this.i18nKey = `sessions.errors.${reason}`
  }
}
