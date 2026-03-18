import { inject } from '@adonisjs/core'
import type { UserProfile } from '#domain/entities/user_profile'
import { UserLevel, UserObjective } from '#domain/entities/user_profile'
import type { UserPreferences } from '#domain/entities/user_preferences'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { UserRepository } from '#domain/interfaces/user_repository'

export type CompleteOnboardingInput = {
  userId: number
  sportId: number
  level: UserLevel
  objective: UserObjective | null
  preferences: Pick<
    UserPreferences,
    'speedUnit' | 'distanceUnit' | 'weightUnit' | 'weekStartsOn' | 'dateFormat' | 'locale'
  >
}

@inject()
export default class CompleteOnboarding {
  private userProfileRepository: UserProfileRepository
  private userRepository: UserRepository

  constructor(userProfileRepository: UserProfileRepository, userRepository: UserRepository) {
    this.userProfileRepository = userProfileRepository
    this.userRepository = userRepository
  }

  async execute(input: CompleteOnboardingInput): Promise<UserProfile> {
    const profile = await this.userProfileRepository.create({
      userId: input.userId,
      sportId: input.sportId,
      level: input.level,
      objective: input.objective,
      preferences: {
        speedUnit: input.preferences.speedUnit,
        distanceUnit: input.preferences.distanceUnit,
        weightUnit: input.preferences.weightUnit,
        weekStartsOn: input.preferences.weekStartsOn,
        dateFormat: input.preferences.dateFormat,
        locale: input.preferences.locale,
      },
      maxHeartRate: null,
      restingHeartRate: null,
      vma: null,
    })

    await this.userRepository.markOnboardingCompleted(input.userId)

    return profile
  }
}
