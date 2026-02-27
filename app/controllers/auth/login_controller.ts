import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { loginValidator } from '#validators/auth/login_validator'
import LoginUser from '#use_cases/auth/login_user'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'

@inject()
export default class LoginController {
  constructor(private loginUser: LoginUser) {}

  async show({ inertia, response }: HttpContext) {
    if (await this.loginUser.isAuthenticated()) {
      return response.redirect('/')
    }
    try {
      await this.loginUser.ensureUsersExist()
    } catch (error) {
      if (error instanceof NoRegisteredUserError) {
        return response.redirect('/register')
      }
      throw error
    }
    return inertia.render('Auth/Login')
  }

  async login({ request, response, session, i18n }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    try {
      await this.loginUser.execute(email, password)
      return response.redirect('/')
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        session.flashErrors({ form: i18n.t('auth.login.invalidCredentials') })
        return response.redirect().back()
      }
      throw error
    }
  }
}
