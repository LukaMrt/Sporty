import { usePage } from '@inertiajs/react'
import type { UserPreferences } from '../../app/domain/entities/user_preferences'
import {
  formatPaceMinSec,
  formatSwimDistance,
  formatSwimPace,
  isSwimming,
  kmToMiles,
  paceToKmh,
  toSwimPace,
} from '~/lib/format'

type PageProps = {
  userPreferences?: UserPreferences | null
}

export function useUnitConversion() {
  const { userPreferences } = usePage<PageProps>().props
  const speedUnit = userPreferences?.speedUnit ?? 'min_km'
  const distanceUnit = userPreferences?.distanceUnit ?? 'km'

  /**
   * `paceMinPerKm` reste en min/km pour tous les sports ; la natation est
   * toujours affichée en min/100 m, quelle que soit la préférence.
   */
  const formatSpeed = (paceMinPerKm: number, sportSlug?: string | null): string => {
    if (isSwimming(sportSlug)) return formatSwimPace(toSwimPace(paceMinPerKm))
    if (speedUnit === 'km_h') {
      return `${paceToKmh(paceMinPerKm).toFixed(1)} km/h`
    }
    return `${formatPaceMinSec(paceMinPerKm)}/km`
  }

  const formatDistanceParts = (
    km: number,
    sportSlug?: string | null
  ): { value: string; unit: string } => {
    if (isSwimming(sportSlug)) {
      const [value, unit] = formatSwimDistance(km).split(' ')
      return { value, unit }
    }
    if (distanceUnit === 'mi') {
      return { value: kmToMiles(km).toFixed(1), unit: 'mi' }
    }
    return { value: km.toFixed(1), unit: 'km' }
  }

  const formatDistance = (km: number, sportSlug?: string | null): string => {
    const { value, unit } = formatDistanceParts(km, sportSlug)
    return `${value} ${unit}`
  }

  const convertPaceForChart = (paceMinPerKm: number): number => {
    if (speedUnit === 'km_h') return paceToKmh(paceMinPerKm)
    return paceMinPerKm
  }

  return {
    formatSpeed,
    formatDistance,
    formatDistanceParts,
    convertPaceForChart,
    speedUnit,
    distanceUnit,
  }
}
