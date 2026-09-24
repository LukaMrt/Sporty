import { inject } from '@adonisjs/core'
import { GpxParser, type GpxParseResult } from '#domain/interfaces/gpx_parser'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

export type ParseGpxFileResult = {
  tempId: string
  parsed: GpxParseResult
}

@inject()
export default class ParseGpxFile {
  constructor(
    private gpxParser: GpxParser,
    private gpxFileStorage: GpxFileStorage
  ) {}

  async execute(content: Buffer, userId: number): Promise<ParseGpxFileResult> {
    const parsed = this.gpxParser.parse(content.toString('utf-8'))
    const tempId = await this.gpxFileStorage.saveTempFile(content, userId)
    return { tempId, parsed }
  }
}
