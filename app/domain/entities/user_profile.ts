import type { UserPreferences } from '#domain/entities/user_preferences'

export enum UserLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
}

export enum UserObjective {
  EnduranceProgress = 'endurance_progress',
  RunFaster = 'run_faster',
  ComebackAfterBreak = 'comeback_after_break',
  MaintainFitness = 'maintain_fitness',
  PrepareCompetition = 'prepare_competition',
}

export interface UserProfile {
  id: number
  userId: number
  sportId: number
  level: UserLevel | null
  objective: UserObjective | null
  preferences: UserPreferences
}
