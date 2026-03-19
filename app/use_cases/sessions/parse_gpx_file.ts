import { inject } from '@adonisjs/core'
import { GpxParser, type GpxParseResult } from '#domain/interfaces/gpx_parser'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

export interface ParseGpxFileResult {
  tempId: string
  parsed: GpxParseResult
}

@inject()
export default class ParseGpxFile {
  constructor(
    private gpxParser: GpxParser,
    private gpxFileStorage: GpxFileStorage
  ) {}

  async execute(content: Buffer): Promise<ParseGpxFileResult> {
    const parsed = this.gpxParser.parse(content.toString('utf-8'))
    const tempId = await this.gpxFileStorage.saveTempFile(content)
    return { tempId, parsed }
  }
}
