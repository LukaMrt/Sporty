import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ImportSessions from '#use_cases/import/import_sessions'

const batchValidator = vine.create(
  vine.object({
    importSessionIds: vine.array(vine.number().positive()).minLength(1),
  })
)

@inject()
export default class ImportController {
  constructor(private importSessions: ImportSessions) {}

  async batch({ request, auth, response }: HttpContext) {
    const { importSessionIds } = await request.validateUsing(batchValidator)
    const result = await this.importSessions.execute({ userId: auth.user!.id, importSessionIds })
    return response.json(result)
  }
}
