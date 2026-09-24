export type PaceZoneRange = {
  minPacePerKm: number // min/km (allure la plus rapide de la zone)
  maxPacePerKm: number // min/km (allure la plus lente de la zone)
}

export type PaceZones = {
  easy: PaceZoneRange
  marathon: PaceZoneRange
  threshold: PaceZoneRange
  interval: PaceZoneRange
  repetition: PaceZoneRange
}
