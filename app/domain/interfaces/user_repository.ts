import type { User } from '#domain/entities/user'

export abstract class UserRepository {
  abstract countAll(): Promise<number>
  abstract create(user: Omit<User, 'id'>): Promise<User>
  abstract findByEmail(email: string): Promise<User | null>
  abstract findAll(): Promise<User[]>
  abstract findById(id: number): Promise<User | null>
  abstract update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User>
  abstract delete(id: number): Promise<void>
  abstract verifyPassword(userId: number, password: string): Promise<boolean>
  abstract markOnboardingCompleted(userId: number): Promise<void>
}
