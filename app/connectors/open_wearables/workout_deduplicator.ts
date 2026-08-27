import type { RawOwWorkout } from '#connectors/open_wearables/types'

/**
 * Champs completes depuis un perdant du groupe quand le gagnant ne les porte pas.
 * `duration_seconds` et `distance_meters` en sont volontairement exclus : ils
 * definissent la seance retenue et ne doivent pas etre melanges entre sources.
 */
const MERGEABLE_FIELDS = [
  'calories_kcal',
  'elevation_gain_meters',
  'avg_heart_rate_bpm',
  'max_heart_rate_bpm',
  'name',
] as const

type MergeableField = (typeof MERGEABLE_FIELDS)[number]

/** Complete un champ absent du gagnant depuis le premier perdant qui le porte. */
function fillIfMissing<K extends MergeableField>(
  target: RawOwWorkout,
  group: RawOwWorkout[],
  field: K
): void {
  if (target[field] !== null && target[field] !== undefined) return
  const donor = group.find((w) => w[field] !== null && w[field] !== undefined)
  if (donor) target[field] = donor[field]
}

function groupKey(workout: RawOwWorkout): string {
  return `${new Date(workout.start_time).getTime()}|${workout.type}`
}

function hasDistance(workout: RawOwWorkout): boolean {
  return workout.distance_meters !== null && workout.distance_meters > 0
}

/**
 * Elit le meilleur enregistrement du groupe.
 *
 * 1. celui qui porte une distance (l'autre source n'a pas suivi le deplacement)
 * 2. a egalite, la duree la plus courte : c'est le temps actif, equivalent du
 *    `moving_time` de Strava, et c'est lui qui alimente TRIMP et charge
 * 3. a egalite stricte, le plus petit id : deterministe, jamais aleatoire
 */
function elect(a: RawOwWorkout, b: RawOwWorkout): RawOwWorkout {
  const aHas = hasDistance(a)
  const bHas = hasDistance(b)
  if (aHas !== bHas) return aHas ? a : b

  if (a.duration_seconds !== b.duration_seconds) {
    return a.duration_seconds < b.duration_seconds ? a : b
  }

  return a.id <= b.id ? a : b
}

/**
 * Deduplique les seances renvoyees par open-wearables.
 *
 * Le serveur emet une seance par source ayant enregistre l'activite (montre ET
 * telephone chez Apple), avec des UUID differents. Sur un jeu reel de 65 workouts,
 * seuls 36 sont des seances distinctes. Sans deduplication la charge
 * d'entrainement est doublee, ce qui fausse TRIMP, plans et recalibration.
 */
export function dedupeWorkouts(workouts: RawOwWorkout[]): RawOwWorkout[] {
  const winners = new Map<string, RawOwWorkout>()
  const groups = new Map<string, RawOwWorkout[]>()

  for (const workout of workouts) {
    const key = groupKey(workout)
    const group = groups.get(key)
    if (group) {
      group.push(workout)
    } else {
      groups.set(key, [workout])
    }

    const current = winners.get(key)
    winners.set(key, current ? elect(current, workout) : workout)
  }

  return [...winners.entries()].map(([key, winner]) => {
    const group = groups.get(key) ?? []
    if (group.length === 1) return winner

    // Fusion enrichissante : on ne perd pas une donnee que seule l'autre
    // source portait (calories du telephone, D+ de la montre...).
    const merged: RawOwWorkout = { ...winner }
    for (const field of MERGEABLE_FIELDS) {
      fillIfMissing(merged, group, field)
    }
    return merged
  })
}
