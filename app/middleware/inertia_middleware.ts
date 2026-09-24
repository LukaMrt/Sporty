import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { UserPreferences } from '#domain/entities/user_preferences'
import app from '@adonisjs/core/services/app'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import GetUserPreferences from '#use_cases/profile/get_user_preferences'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    const user = ctx.auth?.user
    const locale = ctx.i18n?.locale ?? 'fr'

    return {
      errors: this.getValidationErrors(ctx),
      auth: {
        user: ctx.auth?.user
          ? { id: ctx.auth.user.id, fullName: ctx.auth.user.fullName, role: ctx.auth.user.role }
          : null,
      },
      flash: (ctx.session?.flashMessages.all() ?? {}) as Record<string, string>,
      // Callback : non évalué (donc pas de requête) lors des rechargements partiels
      userPreferences: async () => {
        if (!user) return null
        const useCase = await app.container.make(GetUserPreferences)
        return useCase.execute(user.id)
      },
      locale,
      // Mises en cache côté client : renvoyées seulement au premier chargement
      // et quand la langue change (la clé inclut la locale)
      translations: ctx.inertia.once(() => ctx.i18n?.localeTranslations ?? {}, {
        key: `translations:${locale}`,
      }),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    try {
      const output = await next()
      return output
    } finally {
      this.dispose(ctx)
    }
  }
}

declare module '@adonisjs/inertia/types' {
  export interface SharedProps {
    errors: Record<string, string> | { [errorBag: string]: Record<string, string> }
    auth: { user: { id: number; fullName: string; role: string } | null }
    flash: Record<string, string>
    userPreferences: UserPreferences | null
    locale: string
    translations: Record<string, string>
  }
}
