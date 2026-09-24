import { UserAlreadyExistsError } from '#domain/errors/user_already_exists_error'
import type { User } from '#domain/entities/user'
import { AuthService } from '#domain/interfaces/auth_service'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserRole } from '#domain/value_objects/user_role'
import { inject } from '@adonisjs/core'

export type RegisterUserInput = { email: string; fullName: string; password: string }

/**
 * Inscription du premier utilisateur (qui devient admin). L'inscription est
 * ensuite fermée : les autres comptes sont créés par un admin.
 */
@inject()
export default class RegisterUser {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService
  ) {}

  async show(): Promise<void> {
    const count = await this.userRepository.countAll()
    if (count > 0) throw new UserAlreadyExistsError()
  }

  async registerUser(input: RegisterUserInput): Promise<User> {
    // Vérification + création atomiques : deux inscriptions simultanées
    // ne peuvent plus créer deux admins
    const user = await this.userRepository.createFirstUser({
      ...input,
      role: UserRole.Admin,
      onboardingCompleted: false,
    })
    if (!user) throw new UserAlreadyExistsError()

    await this.authService.login(user)
    return user
  }
}
