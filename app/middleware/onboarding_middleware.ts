import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class OnboardingMiddleware {
  async handle({ auth, response, request }: HttpContext, next: NextFn) {
    const user = auth.user
    if (user && !user.onboardingCompleted) {
      const url = request.url()
      if (!url.startsWith('/onboarding') && url !== '/logout') {
        return response.redirect('/onboarding')
      }
    }
    return next()
  }
}
