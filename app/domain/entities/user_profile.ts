import type { UserPreferences } from '#domain/entities/user_preferences'
import type { BiologicalSex, TrainingState } from '#domain/value_objects/planning_types'
import type { HrZonesConfig } from '#domain/value_objects/heart_rate_zones_config'
import type { PrivacyZone } from '#domain/services/analysis/route'

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
  maxHeartRate: number | null
  restingHeartRate: number | null
  vma: number | null
  sex: BiologicalSex | null
  trainingState: TrainingState
  /** Méthode de zones cardiaques ; absente ou null = `auto` */
  hrZonesConfig?: HrZonesConfig | null
  /** VDOT confirmé par l'athlète */
  vdot?: number | null
  /** Fuseau horaire IANA (ex. Europe/Paris) ; null = UTC */
  timezone?: string | null
  /** Zones masquées sur les cartes (domicile, travail…) */
  privacyZones?: PrivacyZone[] | null
}
