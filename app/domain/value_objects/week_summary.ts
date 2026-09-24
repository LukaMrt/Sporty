export type QualitySessionSummary = {
  sessionType: string
  actualTss: number
  plannedTss: number
}

/** Bilan d'une semaine de plan terminée */
export type WeekSummary = {
  weekNumber: number
  plannedLoadTss: number
  actualLoadTss: number
  qualitySessions: QualitySessionSummary[]
}
