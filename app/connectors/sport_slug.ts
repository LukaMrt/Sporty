/**
 * Slugs de sport internes a Sporty, partages par tous les connecteurs.
 *
 * Vit ici plutot que dans un dossier de provider pour qu'aucun connecteur
 * n'ait a dependre d'un autre.
 */
export type SportySportSlug = 'running' | 'cycling' | 'swimming' | 'walking' | 'hiking' | 'other'

export const CYCLING_SLUGS: SportySportSlug[] = ['cycling']
export const RUNNING_SLUGS: SportySportSlug[] = ['running']
export const SWIMMING_SLUGS: SportySportSlug[] = ['swimming']
