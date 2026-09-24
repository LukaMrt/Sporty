import type { User } from '#domain/entities/user'

export abstract class AuthService {
  abstract login(user: User): Promise<void>
  /** Vérifie les identifiants et ouvre la session ; renvoie l'id de l'utilisateur connecté */
  abstract attempt(email: string, password: string): Promise<number>
  abstract logout(): Promise<void>
}
