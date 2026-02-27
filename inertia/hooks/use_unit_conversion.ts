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

  const formatDistanceParts = (km: number): { value: string; unit: string } => {
    if (distanceUnit === 'mi') {
      return { value: kmToMiles(km).toFixed(1), unit: 'mi' }
    }
    return { value: km.toFixed(1), unit: 'km' }
  }

  const formatDistance = (km: number): string => {
    const { value, unit } = formatDistanceParts(km)
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
