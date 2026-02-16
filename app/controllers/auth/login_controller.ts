import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { loginValidator } from '#validators/auth/login_validator'
import LoginUser from '#use_cases/auth/login_user'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'

@inject()
export default class LoginController {
  constructor(private loginUser: LoginUser) {}

  async show({ auth, inertia, response }: HttpContext) {
    if (await auth.use('web').check()) {
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
}
