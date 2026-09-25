import type { HttpContext } from '@adonisjs/core/http'

/** Aide : glossaire des métriques (contenu entièrement dans les traductions) */
export default class HelpController {
  async metrics({ inertia }: HttpContext) {
    return inertia.render('Help/Metrics', {})
  }
}
