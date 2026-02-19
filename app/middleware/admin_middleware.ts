import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { UserRole } from '#domain/value_objects/user_role'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    if (auth.user?.role !== UserRole.Admin) {
      return response.abort('Accès refusé', 403)
    }
    return next()
  }
}
