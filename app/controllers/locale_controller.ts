import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'

@inject()
export default class LocaleController {
  constructor(private userProfileRepository: UserProfileRepository) {}

  async update({ request, response, auth, session, i18n }: HttpContext) {
    const locale = request.input('locale', 'fr') as 'fr' | 'en'
    const supportedLocales: string[] = ['fr', 'en']

    if (!supportedLocales.includes(locale)) {
      return response.redirect().back()
    }

    // Persist locale in session
    session.put('locale', locale)

    // Persist in user profile if authenticated
    if (auth.user) {
      const profile = await this.userProfileRepository.findByUserId(auth.user.id)
      if (profile) {
        await this.userProfileRepository.update(auth.user.id, {
          preferences: { ...profile.preferences, locale },
        })
      }
    }

    i18n.switchLocale(locale)

    return response.redirect().back()
  }
}
