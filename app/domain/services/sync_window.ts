const HOUR_MS = 60 * 60 * 1000

/** Recouvrement de sécurité avec la synchro précédente (activités publiées en retard) */
export const SYNC_OVERLAP_MS = HOUR_MS
/** Fenêtre par défaut quand le connecteur n'a jamais été synchronisé */
export const FIRST_SYNC_WINDOW_MS = 24 * HOUR_MS
/** Plafond : au-delà, c'est l'import manuel qui prend le relais */
export const MAX_SYNC_WINDOW_MS = 30 * 24 * HOUR_MS

/**
 * Borne de début d'une synchronisation automatique.
 * Repart de la dernière synchro réussie (moins un recouvrement) : un serveur
 * arrêté plusieurs jours ne perd plus les activités de la période.
 */
export function syncWindowStart(
  lastSyncAt: string | null | undefined,
  now: Date = new Date()
): Date {
  const nowMs = now.getTime()
  const last = lastSyncAt ? Date.parse(lastSyncAt) : Number.NaN
  const start = Number.isNaN(last) ? nowMs - FIRST_SYNC_WINDOW_MS : last - SYNC_OVERLAP_MS
  return new Date(Math.max(start, nowMs - MAX_SYNC_WINDOW_MS))
}
