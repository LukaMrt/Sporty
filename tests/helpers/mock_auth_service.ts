import { AuthService } from '#domain/interfaces/auth_service'
import type { User } from '#domain/entities/user'

export function makeMockAuthService(overrides: Partial<AuthService> = {}): AuthService {
  class MockAuthService extends AuthService {
    async login(_user: User): Promise<void> {}
    async attempt(_email: string, _password: string): Promise<number> {
      return 1
    }
    async logout(): Promise<void> {}
  }
  return Object.assign(new MockAuthService(), overrides)
}
