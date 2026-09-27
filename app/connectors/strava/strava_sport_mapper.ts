import type { SportySportSlug } from '#connectors/sport_slug'

export type { SportySportSlug }

const SPORT_TYPE_MAP: Record<string, SportySportSlug> = {
  Run: 'running',
  TrailRun: 'running',
  VirtualRun: 'running',
  Ride: 'cycling',
  MountainBikeRide: 'cycling',
  GravelRide: 'cycling',
  EBikeRide: 'cycling',
  VirtualRide: 'cycling',
  Swim: 'swimming',
  Walk: 'walking',
  Hike: 'hiking',
  WeightTraining: 'strength',
  Crossfit: 'strength',
}

export class StravaSportMapper {
  map(stravaSportType: string): SportySportSlug {
    return SPORT_TYPE_MAP[stravaSportType] ?? 'other'
  }
}
