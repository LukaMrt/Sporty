/** Le GPX envoyé ne correspond manifestement pas à la séance (autre jour) */
export class GpxDateMismatchError extends Error {
  /** Clé de traduction du message affiché à l'utilisateur */
  readonly i18nKey = 'sessions.gpx.errors.date_mismatch'

  constructor(
    readonly sessionDate: string,
    readonly gpxDate: string
  ) {
    super(`GPX date ${gpxDate} does not match session date ${sessionDate}`)
    this.name = 'GpxDateMismatchError'
  }
}
