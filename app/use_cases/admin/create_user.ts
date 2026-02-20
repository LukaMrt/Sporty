import { inject } from '@adonisjs/core'
import type { User } from '#domain/entities/user'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserRole } from '#domain/value_objects/user_role'

export type CreateUserInput = {
  fullName: string
  email: string
  password: string
  role: UserRole
}

@inject()
export default class CreateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    return this.userRepository.create({
      ...input,
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
    })
  }
}
