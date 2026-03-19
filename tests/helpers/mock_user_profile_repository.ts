import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import type { UserProfile } from '#domain/entities/user_profile'

export function makeMockUserProfileRepository(
  overrides: Partial<UserProfileRepository> = {}
): UserProfileRepository {
  class MockRepository extends UserProfileRepository {
    async create(): Promise<UserProfile> {
      throw new Error('not implemented')
    }

    async findByUserId(): Promise<null> {
      return null
    }

    async update(): Promise<UserProfile> {
      throw new Error('not implemented')
    }
  }

  return Object.assign(new MockRepository(), overrides)
}
