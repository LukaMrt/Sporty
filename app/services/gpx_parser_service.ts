import { XMLParser } from 'fast-xml-parser'
import { GpxParser, type GpxParseResult } from '#domain/interfaces/gpx_parser'
import { GpxParseError } from '#domain/errors/gpx_parse_error'
import { analyze, type RawTrackpoint } from '#lib/track_analyzer'

type ParsedXml = {
  gpx?: {
    trk?: Array<{
      trkseg?: Array<{
        trkpt?: Array<Record<string, unknown>>
      }>
    }>
  }
}

export class GpxParserService extends GpxParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['trkpt', 'trkseg', 'trk'].includes(name),
  })

  parse(content: string): GpxParseResult {
    let root: ParsedXml
    try {
      root = this.parser.parse(content) as ParsedXml
    } catch {
      throw new GpxParseError('invalid_format')
    }

    // Toutes les traces et tous les segments : les montres coupent un segment à
    // chaque pause automatique. Le premier point de chaque segment suivant est
    // marqué pour ne pas compter la pause (ni distance ni durée).
    const rawPoints: RawTrackpoint[] = []
    for (const trk of root?.gpx?.trk ?? []) {
      for (const seg of trk.trkseg ?? []) {
        const segmentPoints = this.extractTrackpoints(seg.trkpt ?? [])
        if (segmentPoints.length === 0) continue
        if (rawPoints.length > 0) segmentPoints[0].pausedBefore = true
        rawPoints.push(...segmentPoints)
      }
    }
    rawPoints.sort((a, b) => a.timeMs - b.timeMs)

    if (rawPoints.length < 2) {
      throw new GpxParseError('no_trackpoints')
    }

    const startTime = new Date(rawPoints[0].timeMs).toISOString()
    const result = analyze(rawPoints)

    return { ...result, startTime }
  }

  private extractTrackpoints(trkpts: Array<Record<string, unknown>>): RawTrackpoint[] {
    const points: RawTrackpoint[] = []

    for (const pt of trkpts) {
      const lat = Number.parseFloat(String(pt['@_lat']))
      const lon = Number.parseFloat(String(pt['@_lon']))
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue

      const timeStr = pt['time']
      if (typeof timeStr !== 'string') continue
      const timeMs = new Date(timeStr).getTime()
      if (Number.isNaN(timeMs)) continue

      const eleRaw = pt['ele']
      const ele =
        typeof eleRaw === 'number'
          ? eleRaw
          : typeof eleRaw === 'string'
            ? Number.parseFloat(eleRaw)
            : undefined

      let hr: number | undefined
      let cad: number | undefined
      if (pt['extensions']) {
        const hrVal = this.findInExtensions(pt['extensions'], 'hr')
        const cadVal = this.findInExtensions(pt['extensions'], 'cad')
        if (hrVal !== undefined) hr = Math.round(Number.parseFloat(hrVal))
        if (cadVal !== undefined) cad = Math.round(Number.parseFloat(cadVal))
      }

      points.push({ lat, lon, ele, timeMs, hr, cad })
    }

    return points
  }

  private findInExtensions(obj: unknown, key: string): string | undefined {
    if (typeof obj !== 'object' || obj === null) return undefined

    for (const k of Object.keys(obj)) {
      if (k === key || k.endsWith(':' + key)) {
        const val = (obj as Record<string, unknown>)[k]
        if (typeof val === 'number' || typeof val === 'string') return String(val)
      }
      const found = this.findInExtensions((obj as Record<string, unknown>)[k], key)
      if (found !== undefined) return found
    }
    return undefined
  }
}
