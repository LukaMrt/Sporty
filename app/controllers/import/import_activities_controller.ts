import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import IgnoreActivity from '#use_cases/import/ignore_activity'
import RestoreActivity from '#use_cases/import/restore_activity'

@inject()
export default class ImportActivitiesController {
  constructor(
    private ignoreActivity: IgnoreActivity,
    private restoreActivity: RestoreActivity
  ) {}

  async ignore({ params, response }: HttpContext) {
    await this.ignoreActivity.execute({ id: Number(params.id) })
    return response.status(200).json({ ok: true })
  }

  async restore({ params, response }: HttpContext) {
    await this.restoreActivity.execute({ id: Number(params.id) })
    return response.status(200).json({ ok: true })
  }
}
