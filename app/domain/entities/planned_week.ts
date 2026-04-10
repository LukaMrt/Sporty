export interface PlannedWeek {
  id: number
  planId: number
  weekNumber: number
  phaseName: string
  phaseLabel: string
  isRecoveryWeek: boolean
  targetVolumeMinutes: number
  createdAt: string
  updatedAt: string
}
