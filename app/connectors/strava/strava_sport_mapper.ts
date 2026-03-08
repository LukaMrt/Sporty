export type SportySportSlug = 'course' | 'velo' | 'natation' | 'marche' | 'randonnee' | 'autre'

const SPORT_TYPE_MAP: Record<string, SportySportSlug> = {
  Run: 'course',
  TrailRun: 'course',
  VirtualRun: 'course',
  Ride: 'velo',
  MountainBikeRide: 'velo',
  GravelRide: 'velo',
  EBikeRide: 'velo',
  VirtualRide: 'velo',
  Swim: 'natation',
  Walk: 'marche',
  Hike: 'randonnee',
}

export class StravaSportMapper {
  map(stravaSportType: string): SportySportSlug {
    return SPORT_TYPE_MAP[stravaSportType] ?? 'autre'
  }
}
