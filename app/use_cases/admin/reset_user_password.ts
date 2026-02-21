import { inject } from '@adonisjs/core'
import { UserRepository } from '#domain/interfaces/user_repository'

@inject()
export default class ResetUserPassword {
  constructor(private userRepository: UserRepository) {}

  async execute(id: number, password: string): Promise<void> {
    await this.userRepository.update(id, { password })
  }
}
