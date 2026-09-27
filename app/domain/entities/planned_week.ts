export type PlannedWeek = {
  id: number
  planId: number
  weekNumber: number
  phaseName: string
  phaseLabel: string
  isRecoveryWeek: boolean
  targetVolumeMinutes: number
  /** Objectif ou consignes de la semaine */
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type NewPlannedWeek = Omit<PlannedWeek, 'id' | 'createdAt' | 'updatedAt' | 'notes'> & {
  notes?: string | null
}
