import type { UserRole } from '#domain/value_objects/user_role'

/**
 * Utilisateur tel que vu par le domaine.
 * Le hash du mot de passe n'en fait volontairement pas partie : il ne sort jamais
 * de la couche de persistance (vérification via `UserRepository.verifyPassword`).
 */
export interface User {
  id: number
  email: string
  fullName: string
  role: UserRole
  onboardingCompleted: boolean
  createdAt: string
}

/** Données de création : seul moment où un mot de passe (en clair) entre dans le domaine */
export type NewUser = Omit<User, 'id' | 'createdAt'> & { password: string }

/** Données modifiables ; `password` est un mot de passe en clair, haché par la persistance */
export type UserUpdate = Partial<Omit<User, 'id' | 'createdAt'>> & { password?: string }
