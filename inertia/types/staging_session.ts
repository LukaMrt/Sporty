export type StagingSessionStatus = 'new' | 'imported' | 'ignored' | 'importing'

export interface StagingSession {
  id: number
  externalId: string
  status: StagingSessionStatus
  date: string
  name: string
  sportType: string
  durationMinutes: number
  distanceKm: number | null
}
