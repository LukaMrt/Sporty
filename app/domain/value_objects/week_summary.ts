export interface QualitySessionSummary {
  sessionType: string
  actualTss: number
  plannedTss: number
}

/** Bilan d'une semaine de plan terminée */
export interface WeekSummary {
  weekNumber: number
  plannedLoadTss: number
  actualLoadTss: number
  qualitySessions: QualitySessionSummary[]
}
