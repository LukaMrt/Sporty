import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetAnalysis from '#use_cases/analysis/get_analysis'
import ExportUserData from '#use_cases/analysis/export_user_data'
import { analysisValidator } from '#validators/analysis/analysis_validator'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

@inject()
export default class AnalysisController {
  constructor(
    private getAnalysis: GetAnalysis,
    private exportUserData: ExportUserData
  ) {}

  async index({ inertia, auth, request }: HttpContext) {
    const { range, pace } = await request.validateUsing(analysisValidator)
    const analysis = await this.getAnalysis.execute(auth.user!.id, range ?? '6m', pace)
    return inertia.render('Analysis/Index', { analysis })
  }

  async exportSessions({ auth, response }: HttpContext) {
    const csv = await this.exportUserData.sessionsCsv(auth.user!.id)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.attachment('sporty-seances.csv')
    return response.send(csv)
  }

  async exportDailyMetrics({ auth, response }: HttpContext) {
    const csv = await this.exportUserData.dailyMetricsCsv(auth.user!.id)
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.attachment('sporty-metriques-quotidiennes.csv')
    return response.send(csv)
  }

  async exportGpx({ auth, params, response }: HttpContext) {
    try {
      const gpx = await this.exportUserData.sessionGpx(auth.user!.id, Number(params.id))
      if (!gpx) return response.notFound()
      response.header('Content-Type', 'application/gpx+xml')
      response.attachment(`sporty-seance-${params.id}.gpx`)
      return response.send(gpx)
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        return response.notFound()
      }
      throw error
    }
  }
}
