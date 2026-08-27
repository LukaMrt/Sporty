import type { SportySportSlug } from '#connectors/sport_slug'

/**
 * Les types open-wearables sont deja normalises et coincident avec les slugs
 * Sporty : le mapping est l'identite. Tout type inconnu retombe sur 'other',
 * que le pipeline d'import signalera comme sport non supporte.
 */
const SUPPORTED: Record<string, SportySportSlug> = {
  running: 'running',
  cycling: 'cycling',
  swimming: 'swimming',
  walking: 'walking',
  hiking: 'hiking',
}

export class OpenWearablesSportMapper {
  map(type: string): SportySportSlug {
    return SUPPORTED[type] ?? 'other'
  }
}
