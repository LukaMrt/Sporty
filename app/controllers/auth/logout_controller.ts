import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import LogoutUser from '#use_cases/auth/logout_user'

@inject()
export default class LogoutController {
  constructor(private logoutUser: LogoutUser) {}

  async logout({ response }: HttpContext) {
    await this.logoutUser.execute()
    return response.redirect('/login')
  }
}
