import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import HandleOpenWearablesWebhook from '#use_cases/connectors/handle_open_wearables_webhook'

@inject()
export default class OpenWearablesWebhookController {
  constructor(private handleWebhook: HandleOpenWearablesWebhook) {}

  /** POST /webhooks/open-wearables — hors session, authentifié par signature */
  async handle({ request, response }: HttpContext) {
    const headers = {
      'svix-id': request.header('svix-id'),
      'svix-timestamp': request.header('svix-timestamp'),
      'svix-signature': request.header('svix-signature'),
    }
    const outcome = await this.handleWebhook.execute(request.raw() ?? '', headers)
    if (outcome === 'invalid_signature')
      return response.unauthorized({ error: 'invalid signature' })
    return response.noContent()
  }
}
