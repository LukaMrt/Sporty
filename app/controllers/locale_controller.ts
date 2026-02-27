import type { HttpContext } from '@adonisjs/core/http'

export default class LocaleController {
  async update({ request, response, auth, session, i18n }: HttpContext) {
    const locale = request.input('locale', 'fr')
    const supportedLocales = ['fr', 'en']

    if (!supportedLocales.includes(locale)) {
      return response.redirect().back()
    }

    // Persist locale in session
    session.put('locale', locale)

    // Persist in user model if authenticated
    const user = auth.user
    if (user) {
      user.locale = locale
      await user.save()
    }

    i18n.switchLocale(locale)

    return response.redirect().back()
  }
}
