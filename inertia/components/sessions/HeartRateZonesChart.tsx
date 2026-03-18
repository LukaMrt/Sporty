import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import type { HeartRateZones } from '../../../app/domain/value_objects/run_metrics'

const ZONE_COLORS: Record<string, string> = {
  Z1: '#9ca3af', // gris
  Z2: '#60a5fa', // bleu
  Z3: '#34d399', // vert
  Z4: '#fb923c', // orange
  Z5: '#f87171', // rouge doux
}

interface HeartRateZonesChartProps {
  hrZones: HeartRateZones
}

export default function HeartRateZonesChart({ hrZones }: HeartRateZonesChartProps) {
  const { t } = useTranslation()
  const totalSeconds = hrZones.z1 + hrZones.z2 + hrZones.z3 + hrZones.z4 + hrZones.z5

  const data = (['z1', 'z2', 'z3', 'z4', 'z5'] as const).map((key, i) => {
    const label = `Z${i + 1}`
    const seconds = hrZones[key]
    const percent = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0
    const minutes = Math.round(seconds / 60)
    return { label, percent, minutes, fill: ZONE_COLORS[label] }
  })

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="label" width={28} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload?: { minutes: number } }) => [
              `${value}% (${props.payload?.minutes ?? 0} min)`,
              t('sessions.show.hrZonesTime'),
            ]}
            cursor={{ fill: 'transparent' }}
          />
          <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={ZONE_COLORS[entry.label]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Légende compacte */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {data.map((entry) => (
          <span key={entry.label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: ZONE_COLORS[entry.label] }}
            />
            {entry.label} {entry.percent}%
          </span>
        ))}
      </div>
    </div>
  )
}
