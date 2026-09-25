import type { RawOwWorkout } from '#connectors/open_wearables/types'
import { OpenWearablesSportMapper } from '#connectors/open_wearables/open_wearables_sport_mapper'

const sportMapper = new OpenWearablesSportMapper()

/**
 * Famille d'activité servant au rapprochement : deux sources peuvent typer la
 * même séance `swimming` et `pool_swimming`. Les types non supportés gardent
 * leur type brut, sinon yoga et musculation (tous deux « other ») fusionneraient.
 */
function activityFamily(type: string): string {
  const slug = sportMapper.map(type)
  return slug === 'other' ? type : slug
}

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

/**
 * Tolérance sur l'heure de départ : la montre et le téléphone n'horodatent pas
 * toujours à la milliseconde près la même séance.
 */
export const START_TOLERANCE_MS = 30_000

/** Deux enregistrements décrivent-ils la même séance (même sport, départ à ±30 s) ? */
export function isSameWorkout(
  a: Pick<RawOwWorkout, 'start_time' | 'type'>,
  b: Pick<RawOwWorkout, 'start_time' | 'type'>
): boolean {
  return (
    activityFamily(a.type) === activityFamily(b.type) &&
    Math.abs(new Date(a.start_time).getTime() - new Date(b.start_time).getTime()) <=
      START_TOLERANCE_MS
  )
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
  // Regroupement par sport + départ à ±30 s. Tri chronologique (puis par id pour
  // rester déterministe) : chaque séance rejoint le groupe dont le premier départ
  // est assez proche, sinon ouvre un nouveau groupe.
  const sorted = [...workouts].sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime() ||
      a.id.localeCompare(b.id)
  )
  const groups: RawOwWorkout[][] = []
  for (const workout of sorted) {
    const group = groups.find((g) => isSameWorkout(g[0], workout))
    if (group) group.push(workout)
    else groups.push([workout])
  }

  return groups.map((group) => {
    const winner = group.reduce((best, w) => elect(best, w))
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
