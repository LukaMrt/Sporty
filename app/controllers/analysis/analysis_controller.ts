import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetAnalysis from '#use_cases/analysis/get_analysis'
import ExportUserData from '#use_cases/analysis/export_user_data'
import RouteAnalysis from '#use_cases/analysis/route_analysis'
import GetPeriodReport from '#use_cases/analysis/get_period_report'
import {
  analysisValidator,
  compareValidator,
  reportValidator,
} from '#validators/analysis/analysis_validator'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'

@inject()
export default class AnalysisController {
  constructor(
    private getAnalysis: GetAnalysis,
    private exportUserData: ExportUserData,
    private routeAnalysis: RouteAnalysis,
    private getPeriodReport: GetPeriodReport
  ) {}

  /** F3 · GET /analysis/compare?ids[]=1&ids[]=2 */
  async compare({ inertia, auth, request, response }: HttpContext) {
    const { ids } = await request.validateUsing(compareValidator, {
      data: { ids: [request.input('ids', [])].flat().map(Number) },
    })
    try {
      const sessions = await this.routeAnalysis.compare(auth.user!.id, ids)
      return inertia.render('Analysis/Compare', { sessions })
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        return response.notFound()
      }
      throw error
    }
  }

  /** F2 · GET /analysis/map — toutes les traces, zones de confidentialité masquées */
  async map({ inertia, auth }: HttpContext) {
    const tracks = await this.routeAnalysis.heatmap(auth.user!.id)
    return inertia.render('Analysis/Map', { tracks })
  }

  /** H2 · GET /analysis/report?period=week|month&date=YYYY-MM-DD */
  async report({ inertia, auth, request }: HttpContext) {
    const { period, date } = await request.validateUsing(reportValidator)
    const report = await this.getPeriodReport.execute(auth.user!.id, period ?? 'week', date)
    return inertia.render('Analysis/Report', { report })
  }

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
