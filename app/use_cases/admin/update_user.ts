import { inject } from '@adonisjs/core'
import type { User } from '#domain/entities/user'
import { UserRepository } from '#domain/interfaces/user_repository'

export type UpdateUserInput = {
  fullName?: string
  email?: string
}

@inject()
export default class UpdateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(id: number, input: UpdateUserInput): Promise<User> {
    return this.userRepository.update(id, input)
  }
}
