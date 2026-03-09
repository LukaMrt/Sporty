import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ImportActivities from '#use_cases/import/import_activities'

const batchValidator = vine.create(
  vine.object({
    importActivityIds: vine.array(vine.number().positive()).minLength(1),
  })
)

@inject()
export default class ImportController {
  constructor(private importActivities: ImportActivities) {}

  async batch({ request, auth, response }: HttpContext) {
    const { importActivityIds } = await request.validateUsing(batchValidator)
    const result = await this.importActivities.execute({ userId: auth.user!.id, importActivityIds })
    return response.json(result)
  }
}
