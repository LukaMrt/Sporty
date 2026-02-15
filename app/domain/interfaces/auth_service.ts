import type { User } from '#domain/entities/user'

export abstract class AuthService {
  abstract login(user: User): Promise<void>
}
