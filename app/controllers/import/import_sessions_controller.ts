import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import IgnoreSession from '#use_cases/import/ignore_session'
import RestoreSession from '#use_cases/import/restore_session'

@inject()
export default class ImportSessionsController {
  constructor(
    private ignoreSession: IgnoreSession,
    private restoreSession: RestoreSession
  ) {}

  async ignore({ auth, params, response }: HttpContext) {
    await this.ignoreSession.execute({ id: Number(params.id), userId: auth.user!.id })
    return response.status(200).json({ ok: true })
  }

  async restore({ auth, params, response }: HttpContext) {
    await this.restoreSession.execute({ id: Number(params.id), userId: auth.user!.id })
    return response.status(200).json({ ok: true })
  }
}
