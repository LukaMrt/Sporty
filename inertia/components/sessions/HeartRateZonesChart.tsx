import { useTranslation } from '~/hooks/use_translation'
import type { HeartRateZones } from '../../../app/domain/value_objects/run_metrics'

const ZONES = [
  { key: 'z1' as const, label: 'Z1', color: '#9ca3af' },
  { key: 'z2' as const, label: 'Z2', color: '#60a5fa' },
  { key: 'z3' as const, label: 'Z3', color: '#34d399' },
  { key: 'z4' as const, label: 'Z4', color: '#fb923c' },
  { key: 'z5' as const, label: 'Z5', color: '#f87171' },
]

interface HrZoneThreshold {
  zone: number
  minBpm: number
  maxBpm: number
}

interface HeartRateZonesChartProps {
  hrZones: HeartRateZones
  hrZoneThresholds?: HrZoneThreshold[]
}

export default function HeartRateZonesChart({
  hrZones,
  hrZoneThresholds,
}: HeartRateZonesChartProps) {
  const { t } = useTranslation()
  const totalSeconds = ZONES.reduce((sum, z) => sum + hrZones[z.key], 0)

  const thresholdMap = new Map(hrZoneThresholds?.map((z) => [z.zone, z]))

  const data = ZONES.map((z, i) => {
    const seconds = hrZones[z.key]
    const percent = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0
    const minutes = Math.round(seconds / 60)
    const threshold = thresholdMap.get(i + 1)
    return { ...z, seconds, percent, minutes, threshold }
  })

  return (
    <div className="space-y-3">
      {/* Barre horizontale unique segmentée */}
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        {data.map((zone) =>
          zone.percent > 0 ? (
            <div
              key={zone.key}
              title={`${zone.label} — ${Math.round(zone.percent)}% (${zone.minutes} min)${zone.threshold ? ` · ${zone.threshold.minBpm}–${zone.threshold.maxBpm} bpm` : ''}`}
              style={{ width: `${zone.percent}%`, backgroundColor: zone.color }}
            />
          ) : null
        )}
      </div>

      {/* Légende avec bornes */}
      <div className="grid grid-cols-1 gap-y-1">
        {data.map((zone) => (
          <div key={zone.key} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: zone.color }}
            />
            <span className="w-5 font-medium text-foreground">{zone.label}</span>
            {zone.threshold && (
              <span className="text-muted-foreground w-24 shrink-0">
                {zone.threshold.minBpm}–{zone.threshold.maxBpm} bpm
              </span>
            )}
            <span className="font-medium text-foreground">{Math.round(zone.percent)}%</span>
            <span className="text-muted-foreground/60">({zone.minutes} min)</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {t('sessions.show.hrZonesTime')} : {Math.round(totalSeconds / 60)} min
      </p>
    </div>
  )
}
