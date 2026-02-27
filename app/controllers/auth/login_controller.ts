import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { loginValidator } from '#validators/auth/login_validator'
import LoginUser from '#use_cases/auth/login_user'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'
import { UserRepository } from '#domain/interfaces/user_repository'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'

@inject()
export default class LoginController {
  constructor(
    private loginUser: LoginUser,
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository
  ) {}

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

      // Restore user's locale preference from their profile
      const user = await this.userRepository.findByEmail(email)
      if (user) {
        const profile = await this.userProfileRepository.findByUserId(user.id)
        const locale = profile?.preferences?.locale
        if (locale) {
          session.put('locale', locale)
          i18n.switchLocale(locale)
        }
      }

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
