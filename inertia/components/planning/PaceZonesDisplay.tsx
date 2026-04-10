import React from 'react'
import { paceToKmh, formatPaceMinSec } from '~/lib/format'
import { useTranslation } from '~/hooks/use_translation'
import InfoTooltip from '~/components/shared/InfoTooltip'

interface PaceZoneRange {
  minPacePerKm: number
  maxPacePerKm: number
}

interface PaceZones {
  easy: PaceZoneRange
  marathon: PaceZoneRange
  threshold: PaceZoneRange
  interval: PaceZoneRange
  repetition: PaceZoneRange
}

interface PaceZonesDisplayProps {
  paceZones: PaceZones
  speedUnit?: 'min_km' | 'km_h'
}

function formatValue(paceMinPerKm: number, speedUnit: 'min_km' | 'km_h'): string {
  if (speedUnit === 'km_h') return `${paceToKmh(paceMinPerKm).toFixed(1)} km/h`
  return `${formatPaceMinSec(paceMinPerKm)} /km`
}

function formatZone(zone: PaceZoneRange, speedUnit: 'min_km' | 'km_h', range: boolean): string {
  if (!range) return formatValue(zone.minPacePerKm, speedUnit)
  return speedUnit === 'km_h'
    ? `${formatValue(zone.maxPacePerKm, speedUnit)} – ${formatValue(zone.minPacePerKm, speedUnit)}`
    : `${formatValue(zone.minPacePerKm, speedUnit)} – ${formatValue(zone.maxPacePerKm, speedUnit)}`
}

const ZONE_CONFIG = [
  { key: 'easy', label: 'E', range: true, color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'marathon', label: 'M', range: true, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  {
    key: 'threshold',
    label: 'T',
    range: false,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  { key: 'interval', label: 'I', range: false, color: 'bg-red-100 text-red-800 border-red-200' },
  {
    key: 'repetition',
    label: 'R',
    range: false,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
] as const

export default function PaceZonesDisplay({
  paceZones,
  speedUnit = 'min_km',
}: PaceZonesDisplayProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      {ZONE_CONFIG.map(({ key, label, range, color }) => (
        <div
          key={key}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${color}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm w-4">{label}</span>
            <span className="text-sm">{t(`planning.athlete.zones.${key}.name`)}</span>
            <InfoTooltip description={t(`planning.athlete.zones.${key}.description`)} />
          </div>
          <span className="text-sm font-mono font-medium">
            {formatZone(paceZones[key], speedUnit, range)}
          </span>
        </div>
      ))}
    </div>
  )
}
