import { usePage } from '@inertiajs/react'
import type { UserPreferences } from '../../app/domain/entities/user_preferences'
import { formatPaceMinSec, kmToMiles, paceToKmh } from '~/lib/format'

interface PageProps {
  userPreferences?: UserPreferences | null
}

export function useUnitConversion() {
  const { userPreferences } = usePage<PageProps>().props
  const speedUnit = userPreferences?.speedUnit ?? 'min_km'
  const distanceUnit = userPreferences?.distanceUnit ?? 'km'

  const formatSpeed = (paceMinPerKm: number): string => {
    if (speedUnit === 'km_h') {
      return `${paceToKmh(paceMinPerKm).toFixed(1)} km/h`
    }
    return `${formatPaceMinSec(paceMinPerKm)}/km`
  }

  const formatDistance = (km: number): string => {
    if (distanceUnit === 'mi') {
      return `${kmToMiles(km).toFixed(1)} mi`
    }
    return `${km.toFixed(1)} km`
  }

  const convertPaceForChart = (paceMinPerKm: number): number => {
    if (speedUnit === 'km_h') return paceToKmh(paceMinPerKm)
    return paceMinPerKm
  }

  return { formatSpeed, formatDistance, convertPaceForChart, speedUnit, distanceUnit }
}
