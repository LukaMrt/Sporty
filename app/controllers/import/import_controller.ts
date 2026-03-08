import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ImportActivities from '#use_cases/import/import_activities'
import { ImportProgressPort } from '#domain/interfaces/import_progress_port'

const batchValidator = vine.create(
  vine.object({
    importActivityIds: vine.array(vine.number().positive()).minLength(1),
  })
)

@inject()
export default class ImportController {
  constructor(
    private importActivities: ImportActivities,
    private progressPort: ImportProgressPort
  ) {}

  async batch({ request, auth, response }: HttpContext) {
    const { importActivityIds } = await request.validateUsing(batchValidator)
    const userId = auth.user!.id

    this.progressPort.init(userId, importActivityIds.length)

    void this.importActivities.execute({ userId, importActivityIds }).catch((err: unknown) => {
      this.progressPort.incrementFailed(
        userId,
        `fatal: ${err instanceof Error ? err.message : String(err)}`
      )
    })

    return response.status(202).json({ total: importActivityIds.length })
  }

  async progress({ auth, response }: HttpContext) {
    const progress = this.progressPort.get(auth.user!.id)
    if (!progress) {
      return response.json({ total: 0, completed: 0, failed: 0 })
    }
    return response.json(progress)
  }
}
