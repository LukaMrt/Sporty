/**
 * Schemas bruts de l'API open-wearables (verifies sur un serveur reel).
 *
 * Attention : ces noms de champs different de ceux exposes par le connecteur MCP
 * open-wearables, qui applique son propre renommage. Ce sont ceux de l'API REST.
 */

export type RawOwSource = {
  provider: string
  source: string | null
  device: string | null
  device_type: string | null
  device_name: string | null
}

export type RawOwWorkout = {
  id: string
  type: string
  name: string | null
  start_time: string
  end_time: string
  zone_offset: string | null
  duration_seconds: number
  source: RawOwSource
  calories_kcal: number | null
  distance_meters: number | null
  avg_heart_rate_bpm: number | null
  max_heart_rate_bpm: number | null
  avg_pace_sec_per_km: number | null
  elevation_gain_meters: number | null
}

export type RawOwTimeSeriesSample = {
  timestamp: string
  zone_offset: string | null
  type: string
  value: number
  unit: string
  source: RawOwSource
  is_daily_total: boolean | null
}

export type RawOwPagination = {
  next_cursor: string | null
  previous_cursor: string | null
  has_more: boolean
  total_count: number
}

/** Enveloppe des endpoints events/timeseries. */
export type OwPaginated<T> = {
  data: T[]
  pagination: RawOwPagination
  metadata?: Record<string, unknown>
}

export type RawOwUser = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

/** `GET /users` utilise une pagination par page, pas par cursor. */
export type OwUserList = {
  items: RawOwUser[]
  total: number
}
