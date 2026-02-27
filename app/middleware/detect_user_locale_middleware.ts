import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'

export default class DetectUserLocaleMiddleware {
  static {
    RequestValidator.messagesProvider = (ctx) => {
      return ctx.i18n.createMessagesProvider()
    }
  }

  protected getRequestLocale(ctx: HttpContext): string | null {
    // 1. Check user's saved locale preference
    const user = ctx.auth?.user
    if (user && (user as { locale?: string | null }).locale) {
      const userLocale = (user as { locale?: string | null }).locale!
      if (i18nManager.supportedLocales().includes(userLocale)) {
        return userLocale
      }
    }

    // 2. Check session
    const sessionLocale = ctx.session?.get('locale') as string | undefined
    if (sessionLocale && i18nManager.supportedLocales().includes(sessionLocale)) {
      return sessionLocale
    }

    // 3. Fall back to Accept-Language header
    const userLanguages = ctx.request.languages()
    return i18nManager.getSupportedLocaleFor(userLanguages)
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const language = this.getRequestLocale(ctx)
    ctx.i18n = i18nManager.locale(language || i18nManager.defaultLocale)
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    if ('view' in ctx) {
      ctx.view.share({ i18n: ctx.i18n })
    }

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
