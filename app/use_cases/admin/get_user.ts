import { inject } from '@adonisjs/core'
import type { User } from '#domain/entities/user'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserNotFoundError } from '#domain/errors/user_not_found_error'

@inject()
export default class GetUser {
  constructor(private userRepository: UserRepository) {}

  async execute(id: number): Promise<User> {
    const user = await this.userRepository.findById(id)
    if (!user) throw new UserNotFoundError(id)
    return user
  }
}
