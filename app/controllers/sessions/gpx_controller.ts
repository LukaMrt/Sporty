import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import ParseGpxFile from '#use_cases/sessions/parse_gpx_file'
import EnrichSessionWithGpx from '#use_cases/sessions/enrich_session_with_gpx'
import { GpxParseError } from '#domain/errors/gpx_parse_error'
import { SessionNotFoundError } from '#domain/errors/session_not_found_error'
import { SessionForbiddenError } from '#domain/errors/session_forbidden_error'
import { parseGpxValidator } from '#validators/sessions/gpx_validator'

@inject()
export default class GpxController {
  constructor(
    private parseGpxFile: ParseGpxFile,
    private enrichSessionWithGpx: EnrichSessionWithGpx
  ) {}

  /**
   * POST /sessions/parse-gpx
   * Parse un fichier GPX et retourne les données extraites + un tempId.
   */
  async parseGpx({ request, response }: HttpContext) {
    const data = await request.validateUsing(parseGpxValidator)
    const content = await readFile(data.gpx_file.tmpPath!)

    let result
    try {
      result = await this.parseGpxFile.execute(content)
    } catch (error) {
      if (error instanceof GpxParseError) {
        return response.badRequest({ error: error.message })
      }
      throw error
    }

    const { tempId, parsed } = result
    const startDate = parsed.startTime
      ? parsed.startTime.split('T')[0]
      : new Date().toISOString().split('T')[0]

    return response.json({
      tempId,
      startDate,
      durationMinutes: Math.round(parsed.durationSeconds / 60),
      distanceKm: Math.round((parsed.distanceMeters / 1000) * 100) / 100,
      avgHeartRate: parsed.avgHeartRate ?? null,
      minHeartRate: parsed.minHeartRate ?? null,
      maxHeartRate: parsed.maxHeartRate ?? null,
      cadenceAvg: parsed.cadenceAvg ?? null,
      elevationGain: parsed.elevationGain ?? null,
      elevationLoss: parsed.elevationLoss ?? null,
      sportMetrics: {
        heartRateCurve: parsed.heartRateCurve,
        paceCurve: parsed.paceCurve,
        altitudeCurve: parsed.altitudeCurve,
        gpsTrack: parsed.gpsTrack,
        splits: parsed.splits,
      },
    })
  }

  /**
   * POST /sessions/:id/enrich-gpx
   * Enrichit une séance existante avec un fichier GPX.
   */
  async enrichGpx({ params, request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    const data = await request.validateUsing(parseGpxValidator)
    const content = await readFile(data.gpx_file.tmpPath!)

    try {
      await this.enrichSessionWithGpx.execute(Number(params.id), user.id, content)
      session.flash('success', i18n.t('sessions.flash.gpxEnriched'))
      return response.redirect(`/sessions/${params.id}`)
    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
        session.flash('error', i18n.t('sessions.flash.notFound'))
        return response.redirect('/sessions')
      }
      throw error
    }
  }
}
