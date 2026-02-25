import type { UserProfile } from '#domain/entities/user_profile'
import type { UserObjective } from '#domain/entities/user_profile'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import UserProfileModel from '#models/user_profile'
import db from '@adonisjs/lucid/services/db'

export default class LucidUserProfileRepository extends UserProfileRepository {
  async create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    return db.transaction(async (trx) => {
      const model = await UserProfileModel.create(
        {
          userId: profile.userId,
          level: profile.level,
          objective: profile.objective,
          preferences: profile.preferences,
        },
        { client: trx }
      )

      await trx
        .table('user_profile_sports')
        .insert({ user_profile_id: model.id, sport_id: profile.sportId, created_at: new Date() })

      return {
        id: model.id,
        userId: model.userId,
        sportId: profile.sportId,
        level: model.level,
        objective: model.objective as UserObjective | null,
        preferences: model.preferences,
      }
    })
  }
}
