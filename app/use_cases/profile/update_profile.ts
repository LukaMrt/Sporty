import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'
import type { User } from '#domain/entities/user'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'
import { TrainingState } from '#domain/value_objects/planning_types'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import type { HrZonesConfig } from '#domain/value_objects/heart_rate_zones_config'
import { computeZoneBounds, isZoneBoundsResult } from '#domain/services/heart_rate_zone_bounds'
import { isValidTimezone } from '#domain/services/calendar'
import { InvalidHeartRateZonesError } from '#domain/errors/invalid_heart_rate_zones_error'

export interface UpdateProfileInput {
  fullName?: string
  email?: string
  sportId?: number
  level?: UserProfile['level']
  objective?: UserProfile['objective']
  preferences?: UserProfile['preferences']
  maxHeartRate?: number | null
  restingHeartRate?: number | null
  vma?: number | null
  sex?: UserProfile['sex']
  /** `null` = revenir à la méthode automatique */
  hrZonesConfig?: HrZonesConfig | null
  timezone?: string | null
}

export interface UpdateProfileResult {
  user: Pick<User, 'id' | 'fullName' | 'email'>
  profile: UserProfile | null
}

@inject()
export default class UpdateProfile {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    private eventEmitter: EventEmitter
  ) {}

  async execute(userId: number, data: UpdateProfileInput): Promise<UpdateProfileResult> {
    const userUpdate: { fullName?: string; email?: string } = {}
    if (data.fullName !== undefined) userUpdate.fullName = data.fullName
    if (data.email !== undefined) userUpdate.email = data.email

    let updatedUser: Pick<User, 'id' | 'fullName' | 'email'>
    if (Object.keys(userUpdate).length > 0) {
      const user = await this.userRepository.update(userId, userUpdate)
      updatedUser = { id: user.id, fullName: user.fullName, email: user.email }
    } else {
      const user = await this.userRepository.findById(userId)
      updatedUser = { id: userId, fullName: user?.fullName ?? '', email: user?.email ?? '' }
    }

    const profileUpdate: Partial<Omit<UserProfile, 'id' | 'userId'>> = {}
    if (data.sportId !== undefined) profileUpdate.sportId = data.sportId
    if (data.level !== undefined) profileUpdate.level = data.level
    if (data.objective !== undefined) profileUpdate.objective = data.objective
    if (data.preferences !== undefined) profileUpdate.preferences = data.preferences
    if (data.maxHeartRate !== undefined) profileUpdate.maxHeartRate = data.maxHeartRate
    if (data.restingHeartRate !== undefined) profileUpdate.restingHeartRate = data.restingHeartRate
    if (data.vma !== undefined) profileUpdate.vma = data.vma
    if (data.sex !== undefined) profileUpdate.sex = data.sex
    if (data.hrZonesConfig !== undefined) profileUpdate.hrZonesConfig = data.hrZonesConfig
    if (data.timezone !== undefined) {
      profileUpdate.timezone =
        data.timezone && isValidTimezone(data.timezone) ? data.timezone : null
    }

    const existing =
      Object.keys(profileUpdate).length > 0
        ? await this.userProfileRepository.findByUserId(userId)
        : null

    // Physiologie FUSIONNÉE (nouvelles valeurs ou existantes) : on refuse par exemple
    // la méthode Karvonen si la FC repos n'est ni saisie ni déjà connue
    const merged = {
      maxHeartRate:
        data.maxHeartRate !== undefined ? data.maxHeartRate : (existing?.maxHeartRate ?? null),
      restingHeartRate:
        data.restingHeartRate !== undefined
          ? data.restingHeartRate
          : (existing?.restingHeartRate ?? null),
      hrZonesConfig:
        data.hrZonesConfig !== undefined ? data.hrZonesConfig : (existing?.hrZonesConfig ?? null),
    }
    if (data.hrZonesConfig) {
      const outcome = computeZoneBounds(data.hrZonesConfig.method, merged, data.hrZonesConfig)
      if (!isZoneBoundsResult(outcome)) throw new InvalidHeartRateZonesError(outcome.issue)
    }

    const hrChanged =
      existing !== null &&
      (merged.maxHeartRate !== existing.maxHeartRate ||
        merged.restingHeartRate !== existing.restingHeartRate ||
        JSON.stringify(merged.hrZonesConfig ?? null) !==
          JSON.stringify(existing.hrZonesConfig ?? null) ||
        (data.sex !== undefined && data.sex !== existing.sex))

    let profile: UserProfile | null = null
    if (Object.keys(profileUpdate).length > 0) {
      if (existing) {
        profile = await this.userProfileRepository.update(userId, profileUpdate)
      } else if (profileUpdate.sportId) {
        profile = await this.userProfileRepository.create({
          userId,
          sportId: profileUpdate.sportId,
          level: profileUpdate.level ?? null,
          objective: profileUpdate.objective ?? null,
          preferences: profileUpdate.preferences ?? DEFAULT_USER_PREFERENCES,
          maxHeartRate: profileUpdate.maxHeartRate ?? null,
          restingHeartRate: profileUpdate.restingHeartRate ?? null,
          vma: profileUpdate.vma ?? null,
          sex: profileUpdate.sex ?? null,
          trainingState: TrainingState.Idle,
          hrZonesConfig: profileUpdate.hrZonesConfig ?? null,
          timezone: profileUpdate.timezone ?? null,
        })
      }
    } else {
      profile = await this.userProfileRepository.findByUserId(userId)
    }

    // Zones, TRIMP et charge des séances existantes dépendent de ces valeurs
    if (hrChanged) await this.eventEmitter.emit('profile:hr_changed', { userId })

    return { user: updatedUser, profile }
  }
}
