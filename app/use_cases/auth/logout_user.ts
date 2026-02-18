import { AuthService } from '#domain/interfaces/auth_service'
import { inject } from '@adonisjs/core'

@inject()
export default class LogoutUser {
  constructor(private authService: AuthService) {}

  async execute(): Promise<void> {
    await this.authService.logout()
  }
}
