import type { User } from '#domain/entities/user'

export abstract class UserRepository {
  abstract countAll(): Promise<number>
  abstract create(user: Omit<User, 'id'>): Promise<User>
  abstract findByEmail(email: string): Promise<User | null>
}
