import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'

@inject()
export default class ChangePassword {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const isValid = await this.userRepository.verifyPassword(userId, currentPassword)
    if (!isValid) {
      throw new InvalidCredentialsError()
    }
    await this.userRepository.update(userId, { password: newPassword })
  }
}
