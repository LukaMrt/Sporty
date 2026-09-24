import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'
import UpdateLocale from '#use_cases/profile/update_locale'

@inject()
export default class LocaleController {
  constructor(private updateLocale: UpdateLocale) {}

  async update({ request, response, auth, session, i18n }: HttpContext) {
    const locale = request.input('locale', 'fr') as 'fr' | 'en'

    if (!i18nManager.supportedLocales().includes(locale)) {
      return response.redirect().back()
    }

    session.put('locale', locale)
    if (auth.user) {
      await this.updateLocale.execute(auth.user.id, locale)
    }
    i18n.switchLocale(locale)

    return response.redirect().back()
  }
}
