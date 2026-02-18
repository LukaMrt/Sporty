import { UserAlreadyExistsError } from '#domain/errors/user_already_exists_error'
import type { User } from '#domain/entities/user'
import { AuthService } from '#domain/interfaces/auth_service'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserRole } from '#domain/value_objects/user_role'
import { inject } from '@adonisjs/core'

export type RegisterUserInput = Pick<User, 'email' | 'fullName' | 'password'>

@inject()
export default class RegisterUser {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService
  ) {}

  async show(): Promise<void> {
    await this.checkAdminAlreadyExists()
  }

  async registerUser(input: RegisterUserInput): Promise<User> {
    await this.checkAdminAlreadyExists()

    const user = await this.userRepository.create({
      ...input,
      role: UserRole.Admin,
    })

    await this.authService.login(user)

    return user
  }

  private async checkAdminAlreadyExists(): Promise<void> {
    const count = await this.userRepository.countAll()
    if (count > 0) {
      throw new UserAlreadyExistsError()
    }
  }
}
