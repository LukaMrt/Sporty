import type { User } from '#domain/entities/user'

export abstract class AuthService {
  abstract login(user: User): Promise<void>
  abstract attempt(email: string, password: string): Promise<void>
  abstract logout(): Promise<void>
  abstract isAuthenticated(): Promise<boolean>
}
