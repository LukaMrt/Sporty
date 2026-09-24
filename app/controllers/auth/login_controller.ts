import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { loginValidator } from '#validators/auth/login_validator'
import LoginUser from '#use_cases/auth/login_user'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'
import { NoRegisteredUserError } from '#domain/errors/no_registered_user_error'
import { loginLimiter } from '#start/limiter'

@inject()
export default class LoginController {
  constructor(private loginUser: LoginUser) {}

  async show({ inertia, response }: HttpContext) {
    try {
      await this.loginUser.ensureUsersExist()
    } catch (error) {
      if (error instanceof NoRegisteredUserError) {
        return response.redirect('/register')
      }
      throw error
    }
    return inertia.render('Auth/Login', {})
  }

  async login({ request, response, session, i18n }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    // Seuls les échecs consomment le quota (penalize relance l'erreur du callback) ;
    // une connexion réussie remet le compteur à zéro.
    const key = `login_${request.ip()}_${email.toLowerCase()}`
    let outcome
    try {
      outcome = await loginLimiter().penalize(key, () => this.loginUser.execute(email, password))
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        session.flash('inputErrorsBag', { form: [i18n.t('auth.login.invalidCredentials')] })
        return response.redirect().back()
      }
      throw error
    }

    const [throttled, result] = outcome
    if (throttled) {
      const minutes = Math.ceil(throttled.response.availableIn / 60)
      session.flash('inputErrorsBag', {
        form: [i18n.t('auth.login.tooManyAttempts', { minutes })],
      })
      return response.redirect().back()
    }

    if (result.locale) {
      session.put('locale', result.locale)
      i18n.switchLocale(result.locale)
    }
    return response.redirect('/')
  }
}
