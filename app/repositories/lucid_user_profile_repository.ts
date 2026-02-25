import type { UserProfile } from '#domain/entities/user_profile'
import type { UserObjective } from '#domain/entities/user_profile'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import UserProfileModel from '#models/user_profile'
import db from '@adonisjs/lucid/services/db'

interface UserProfileSportRow {
  sport_id: number
}

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

  async findByUserId(userId: number): Promise<UserProfile | null> {
    const model = await UserProfileModel.findBy('userId', userId)
    if (!model) return null

    const sportRow = (await db
      .from('user_profile_sports')
      .where('user_profile_id', model.id)
      .first()) as UserProfileSportRow | null

    return {
      id: model.id,
      userId: model.userId,
      sportId: sportRow?.sport_id ?? 0,
      level: model.level,
      objective: model.objective as UserObjective | null,
      preferences: model.preferences,
    }
  }

  async update(
    userId: number,
    data: Partial<Omit<UserProfile, 'id' | 'userId'>>
  ): Promise<UserProfile> {
    return db.transaction(async (trx) => {
      const model = await UserProfileModel.query({ client: trx })
        .where('userId', userId)
        .firstOrFail()

      if (data.level !== undefined) model.level = data.level
      if (data.objective !== undefined) model.objective = data.objective
      if (data.preferences !== undefined) model.preferences = data.preferences
      await model.save()

      let sportId: number
      if (data.sportId !== undefined) {
        await trx.from('user_profile_sports').where('user_profile_id', model.id).delete()
        await trx
          .table('user_profile_sports')
          .insert({ user_profile_id: model.id, sport_id: data.sportId, created_at: new Date() })
        sportId = data.sportId
      } else {
        const sportRow = (await trx
          .from('user_profile_sports')
          .where('user_profile_id', model.id)
          .first()) as UserProfileSportRow | null
        sportId = sportRow?.sport_id ?? 0
      }

      return {
        id: model.id,
        userId: model.userId,
        sportId,
        level: model.level,
        objective: model.objective as UserObjective | null,
        preferences: model.preferences,
      }
    })
  }
}
