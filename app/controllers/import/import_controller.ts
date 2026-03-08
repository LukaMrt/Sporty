import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListPreImportActivities, {
  ConnectorNotConnectedError,
} from '#use_cases/import/list_pre_import_activities'

@inject()
export default class ImportController {
  constructor(private listPreImportActivities: ListPreImportActivities) {}

  async index({ inertia, auth, request }: HttpContext) {
    const qs = request.qs() as { date_from?: string; date_to?: string }
    const after = qs.date_from ? new Date(qs.date_from) : undefined
    const before = qs.date_to ? new Date(qs.date_to) : undefined

    try {
      const activities = await this.listPreImportActivities.execute({
        userId: auth.user!.id,
        after,
        before,
      })

      return inertia.render('Import/Index', { activities })
    } catch (error) {
      if (error instanceof ConnectorNotConnectedError) {
        return inertia.render('Import/Index', { activities: null, connectorError: true })
      }
      throw error
    }
  }
}
