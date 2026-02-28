import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { UserPreferences } from '#domain/entities/user_preferences'
import app from '@adonisjs/core/services/app'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    let userPreferences = null
    if (ctx.auth?.user) {
      const repo = await app.container.make(UserProfileRepository)
      const profile = await repo.findByUserId(ctx.auth.user.id)
      userPreferences = profile?.preferences ?? DEFAULT_USER_PREFERENCES
    }

    return {
      errors: this.getValidationErrors(ctx),
      auth: {
        user: ctx.auth?.user
          ? { id: ctx.auth.user.id, fullName: ctx.auth.user.fullName, role: ctx.auth.user.role }
          : null,
      },
      flash: (ctx.session?.flashMessages.all() ?? {}) as Record<string, string>,
      userPreferences,
      locale: ctx.i18n?.locale ?? 'fr',
      translations: ctx.i18n?.localeTranslations ?? {},
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    const output = await next()
    this.dispose(ctx)
    return output
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
