import type { NewUser, User, UserUpdate } from '#domain/entities/user'

export abstract class UserRepository {
  abstract countAll(): Promise<number>
  abstract create(user: NewUser): Promise<User>
  abstract findByEmail(email: string): Promise<User | null>
  abstract findAll(): Promise<User[]>
  abstract findById(id: number): Promise<User | null>
  abstract update(id: number, data: UserUpdate): Promise<User>
  abstract delete(id: number): Promise<void>
  abstract verifyPassword(userId: number, password: string): Promise<boolean>
  abstract markOnboardingCompleted(userId: number): Promise<void>
  abstract countByRole(role: User['role']): Promise<number>
  /** Crée l'utilisateur uniquement si la base est vide (atomique) ; `null` sinon */
  abstract createFirstUser(user: NewUser): Promise<User | null>
}
