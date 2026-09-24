import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'

@inject()
export default class ResetUserPassword {
  constructor(private userRepository: UserRepository) {}

  async execute(id: number, password: string): Promise<void> {
    const user = await this.userRepository.findById(id)
    if (!user) throw new UserNotFoundError(id)
    await this.userRepository.update(id, { password })
  }
}
