import { AuthService } from '#domain/interfaces/auth_service'
import { inject } from '@adonisjs/core'

@inject()
export default class LoginUser {
  constructor(private authService: AuthService) {}

  async execute(email: string, password: string): Promise<void> {
    await this.authService.attempt(email, password)
  }
}
