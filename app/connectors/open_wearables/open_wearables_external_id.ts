const PREFIX = 'ow:'

/**
 * Identifiant stable d'une seance open-wearables.
 *
 * On n'utilise PAS l'UUID renvoye par l'API : le serveur emet plusieurs
 * enregistrements pour une meme seance (montre + telephone) et rien ne garantit
 * que le meme « gagnant » sortira de la deduplication d'une synchro a l'autre.
 * Un basculement creerait une seconde ligne de staging pour la meme seance.
 *
 * La cle est donc derivee de l'instant UTC normalise et du type. Elle est
 * prefixee pour ne jamais entrer en collision avec les ids numeriques Strava
 * dans la colonne partagee `sessions.external_id`, et elle porte l'horodatage,
 * ce qui permet a getSessionDetail de retrouver la seance sans `GET /workouts/{id}`
 * (endpoint qui n'existe pas).
 */
export function encodeExternalId(startTime: string, type: string): string {
  const startUtc = new Date(startTime)
  if (Number.isNaN(startUtc.getTime())) {
    throw new Error(`Invalid workout start_time: ${startTime}`)
  }
  // Secondes entieres : les millisecondes ne sont pas fiables entre deux sources.
  const iso = startUtc.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return `${PREFIX}${iso}|${type}`
}

export function decodeExternalId(externalId: string): { startUtc: Date; type: string } | null {
  if (!externalId.startsWith(PREFIX)) return null

  const body = externalId.slice(PREFIX.length)
  const separator = body.indexOf('|')
  if (separator === -1) return null

  const iso = body.slice(0, separator)
  const type = body.slice(separator + 1)
  if (!type) return null

  const startUtc = new Date(iso)
  if (Number.isNaN(startUtc.getTime())) return null

  return { startUtc, type }
}
