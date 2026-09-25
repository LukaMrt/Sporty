import type { SportySportSlug } from '#connectors/sport_slug'

/**
 * Open Wearables normalise 80+ types d'activité. Les types de base coïncident
 * avec les slugs Sporty ; les variantes (trail, tapis, home-trainer…) sont
 * rattachées à leur sport avec un sous-type conservé pour l'affichage et les
 * filtres. Tout type inconnu retombe sur 'other' (sport non supporté).
 */
const SUPPORTED: Record<string, { slug: SportySportSlug; subType?: string; label: string }> = {
  running: { slug: 'running', label: 'Course à pied' },
  trail_running: { slug: 'running', subType: 'trail', label: 'Trail' },
  treadmill: { slug: 'running', subType: 'treadmill', label: 'Course sur tapis' },
  treadmill_running: { slug: 'running', subType: 'treadmill', label: 'Course sur tapis' },
  track_running: { slug: 'running', subType: 'track', label: 'Course sur piste' },
  cycling: { slug: 'cycling', label: 'Vélo' },
  indoor_cycling: { slug: 'cycling', subType: 'indoor', label: 'Home-trainer' },
  mountain_biking: { slug: 'cycling', subType: 'mountain', label: 'VTT' },
  swimming: { slug: 'swimming', label: 'Natation' },
  pool_swimming: { slug: 'swimming', subType: 'pool', label: 'Natation en piscine' },
  open_water_swimming: {
    slug: 'swimming',
    subType: 'open_water',
    label: 'Natation en eau libre',
  },
  walking: { slug: 'walking', label: 'Marche' },
  hiking: { slug: 'hiking', label: 'Randonnée' },
}

export class OpenWearablesSportMapper {
  map(type: string): SportySportSlug {
    return SUPPORTED[type]?.slug ?? 'other'
  }

  /** Sous-type (trail, treadmill…) ou null pour un type de base */
  subType(type: string): string | null {
    return SUPPORTED[type]?.subType ?? null
  }

  /** Libellé lisible pour nommer une séance sans titre (repli : type brut) */
  label(type: string): string {
    return SUPPORTED[type]?.label ?? type
  }
}
