import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ChangePassword from '#use_cases/profile/change_password'
import { changePasswordValidator } from '#validators/profile/change_password_validator'
import { InvalidCredentialsError } from '#domain/errors/invalid_credentials_error'

@inject()
export default class PasswordController {
  constructor(private changePassword: ChangePassword) {}

  async update({ request, response, session, auth, i18n }: HttpContext) {
    const data = await request.validateUsing(changePasswordValidator)
    try {
      await this.changePassword.execute(auth.user!.id, data.current_password, data.new_password)
      session.flash('success', i18n.t('profile.flash.passwordChanged'))
      return response.redirect().back()
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        session.flash('inputErrorsBag', {
          current_password: [i18n.t('profile.flash.passwordIncorrect')],
        })
        return response.redirect().back()
      }
      throw error
    }
  }
}
