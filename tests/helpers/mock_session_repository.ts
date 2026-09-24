import type { SessionRepository } from '#domain/interfaces/session_repository'
import { BaseMockSessionRepo } from '#tests/helpers/base_mocks'

export function makeMockSessionRepository(
  overrides: Partial<SessionRepository> = {}
): SessionRepository {
  return Object.assign(new BaseMockSessionRepo(), overrides)
}
