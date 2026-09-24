import type { SportySportSlug } from '#connectors/sport_slug'

/**
 * Open Wearables normalise 80+ types d'activité. Les types de base coïncident
 * avec les slugs Sporty ; les variantes (trail, tapis, home-trainer…) sont
 * rattachées à leur sport avec un sous-type conservé pour l'affichage et les
 * filtres. Tout type inconnu retombe sur 'other' (sport non supporté).
 */
const SUPPORTED: Record<string, { slug: SportySportSlug; subType?: string }> = {
  running: { slug: 'running' },
  trail_running: { slug: 'running', subType: 'trail' },
  treadmill: { slug: 'running', subType: 'treadmill' },
  treadmill_running: { slug: 'running', subType: 'treadmill' },
  track_running: { slug: 'running', subType: 'track' },
  cycling: { slug: 'cycling' },
  indoor_cycling: { slug: 'cycling', subType: 'indoor' },
  mountain_biking: { slug: 'cycling', subType: 'mountain' },
  swimming: { slug: 'swimming' },
  pool_swimming: { slug: 'swimming', subType: 'pool' },
  open_water_swimming: { slug: 'swimming', subType: 'open_water' },
  walking: { slug: 'walking' },
  hiking: { slug: 'hiking' },
}

export class OpenWearablesSportMapper {
  map(type: string): SportySportSlug {
    return SUPPORTED[type]?.slug ?? 'other'
  }

  /** Sous-type (trail, treadmill…) ou null pour un type de base */
  subType(type: string): string | null {
    return SUPPORTED[type]?.subType ?? null
  }
}
