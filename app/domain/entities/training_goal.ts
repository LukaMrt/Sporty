export type TrainingGoalStatus = 'active' | 'achieved' | 'abandoned'

export type TrainingGoal = {
  id: number
  userId: number
  targetDistanceKm: number
  targetTimeMinutes: number | null
  eventDate: string | null
  status: TrainingGoalStatus
  createdAt: string
  updatedAt: string
}
