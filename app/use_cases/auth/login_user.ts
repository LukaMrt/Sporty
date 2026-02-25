import { AuthService } from '#domain/interfaces/auth_service'
import { UserRepository } from '#domain/interfaces/user_repository'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'
import { inject } from '@adonisjs/core'

@inject()
export default class LoginUser {
  constructor(
    private authService: AuthService,
    private userRepository: UserRepository
  ) {}

  async execute(email: string, password: string): Promise<void> {
    await this.authService.attempt(email, password)
  }

  async isAuthenticated(): Promise<boolean> {
    return this.authService.isAuthenticated()
  }

  async ensureUsersExist(): Promise<void> {
    const count = await this.userRepository.countAll()
    if (count === 0) {
      throw new NoRegisteredUserError()
    }
  }
}
