import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'
import type { User } from '#domain/entities/user'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'

export interface UpdateProfileInput {
  fullName?: string
  email?: string
  sportId?: number
  level?: UserProfile['level']
  objective?: UserProfile['objective']
  preferences?: UserProfile['preferences']
}

export interface UpdateProfileResult {
  user: Pick<User, 'id' | 'fullName' | 'email'>
  profile: UserProfile | null
}

@inject()
export default class UpdateProfile {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

  async execute(userId: number, data: UpdateProfileInput): Promise<UpdateProfileResult> {
    const userUpdate: Partial<Omit<User, 'id'>> = {}
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

    let profile: UserProfile | null = null
    if (Object.keys(profileUpdate).length > 0) {
      const existing = await this.userProfileRepository.findByUserId(userId)
      if (existing) {
        profile = await this.userProfileRepository.update(userId, profileUpdate)
      } else if (profileUpdate.sportId) {
        profile = await this.userProfileRepository.create({
          userId,
          sportId: profileUpdate.sportId,
          level: profileUpdate.level ?? null,
          objective: profileUpdate.objective ?? null,
          preferences: profileUpdate.preferences ?? DEFAULT_USER_PREFERENCES,
        })
      }
    } else {
      profile = await this.userProfileRepository.findByUserId(userId)
    }

    return { user: updatedUser, profile }
  }
}
