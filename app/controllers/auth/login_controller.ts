import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { loginValidator } from '#validators/auth/login_validator'
import LoginUser from '#use_cases/auth/login_user'
import LogoutUser from '#use_cases/auth/logout_user'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'

@inject()
export default class LoginController {
  constructor(
    private loginUser: LoginUser,
    private logoutUser: LogoutUser
  ) {}

  async show({ inertia, response }: HttpContext) {
    if (await this.loginUser.isAuthenticated()) {
      return response.redirect('/')
    }
    return inertia.render('Auth/Login')
  }

  async login({ request, response, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    try {
      await this.loginUser.execute(email, password)
      return response.redirect('/')
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        session.flashErrors({ form: 'Identifiants incorrects' })
        return response.redirect().back()
      }
      throw error
    }
  }

  async logout({ response }: HttpContext) {
    await this.logoutUser.execute()
    return response.redirect('/login')
  }
}
