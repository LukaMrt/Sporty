import type { HrZonesIssue } from '#domain/value_objects/heart_rate_zones_config'

export class InvalidHeartRateZonesError extends Error {
  readonly i18nKey: string

  constructor(readonly issue: HrZonesIssue) {
    super(`Invalid heart rate zones configuration: ${issue}`)
    this.name = 'InvalidHeartRateZonesError'
    this.i18nKey = `profile.hrZones.errors.${issue}`
  }
}
