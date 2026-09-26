/**
 * Part de la charge d'une séance qui alimente le modèle de forme (CTL/ATL/TSB/ACWR)
 * et le volume de référence des plans. 1 = compte pleinement, 0 = ignorée.
 *
 * La charge brute de la séance (`training_load`) reste inchangée : le coefficient
 * ne s'applique qu'à l'agrégation, à la manière d'Intervals.icu. Le TRIMPexp n'a
 * pas de plancher d'intensité : sans ce coefficient, une longue marche à FC basse
 * pèse presque autant qu'un footing et fausse la forme et les plans.
 */
const CONTRIBUTION_BY_SPORT: Record<string, number> = {
  walking: 0.3,
  // Le dénivelé ajoute une vraie fatigue musculaire, d'où une part plus élevée
  hiking: 0.6,
}

export function loadContribution(sportSlug: string | undefined): number {
  return CONTRIBUTION_BY_SPORT[sportSlug ?? ''] ?? 1
}
