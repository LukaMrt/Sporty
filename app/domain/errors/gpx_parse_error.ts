export type GpxParseErrorCode = 'invalid_format' | 'no_trackpoints'

export class GpxParseError extends Error {
  /** Clé de traduction du message affiché à l'utilisateur */
  readonly i18nKey: string

  constructor(readonly code: GpxParseErrorCode) {
    super(`GPX parse error: ${code}`)
    this.name = 'GpxParseError'
    this.i18nKey = `sessions.gpx.errors.${code}`
  }
}
