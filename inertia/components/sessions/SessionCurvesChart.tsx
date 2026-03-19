import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from 'recharts'
import { useState } from 'react'
import type { DataPoint } from '../../../app/domain/value_objects/run_metrics'
import { formatPaceMinSec, paceToKmh } from '~/lib/format'
import { useTranslation } from '~/hooks/use_translation'

interface ChartDataPoint {
  time: number // secondes
  heartRate?: number
  pace?: number // valeur affichée (min/km ou km/h selon speedUnit)
  altitude?: number
  paceSeconds?: number // valeur brute s/km (pour tooltip)
  km?: number
}

const ZONE_COLORS: Record<number, string> = {
  1: '#9ca3af',
  2: '#60a5fa',
  3: '#34d399',
  4: '#fb923c',
  5: '#f87171',
}

interface HrZoneThreshold {
  zone: number
  minBpm: number
  maxBpm: number
}

interface SessionCurvesChartProps {
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
  speedUnit: 'min_km' | 'km_h'
  hrZoneThresholds?: HrZoneThreshold[]
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function mergeDataPoints(
  heartRateCurve?: DataPoint[],
  paceCurve?: DataPoint[],
  altitudeCurve?: DataPoint[],
  speedUnit: 'min_km' | 'km_h' = 'min_km'
): ChartDataPoint[] {
  const timeSet = new Set<number>()
  heartRateCurve?.forEach((p) => timeSet.add(p.time))
  paceCurve?.forEach((p) => timeSet.add(p.time))
  altitudeCurve?.forEach((p) => timeSet.add(p.time))

  const hrMap = new Map(heartRateCurve?.map((p) => [p.time, p.value]))
  const paceMap = new Map(paceCurve?.map((p) => [p.time, p.value]))
  const altMap = new Map(altitudeCurve?.map((p) => [p.time, p.value]))

  const times = Array.from(timeSet).sort((a, b) => a - b)
  let cumKm = 0
  let prevTime: number | null = null

  return times.map((time) => {
    const paceSeconds = paceMap.get(time)
    let paceDisplay: number | undefined
    if (paceSeconds !== undefined) {
      // paceSeconds est en s/km, on convertit en min/km (valeur décimale) ou km/h
      const paceMinPerKm = paceSeconds / 60
      paceDisplay = speedUnit === 'km_h' ? paceToKmh(paceMinPerKm) : paceMinPerKm
    }

    // Calcul du km courant approximatif
    if (paceSeconds !== undefined && prevTime !== null) {
      const dt = (time - prevTime) / 3600 // heures
      const speed = 3600 / paceSeconds // km/h
      cumKm += speed * dt
    }
    prevTime = time

    return {
      time,
      heartRate: hrMap.get(time),
      pace: paceDisplay,
      altitude: altMap.get(time),
      paceSeconds,
      km: Math.round(cumKm * 100) / 100,
    }
  })
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: ChartDataPoint }>
  label?: number
  speedUnit: 'min_km' | 'km_h'
}

function CustomTooltip({ active, payload, label, speedUnit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null

  const data = payload[0].payload

  return (
    <div className="rounded-lg border bg-card p-2 shadow-md text-xs space-y-1">
      <p className="font-semibold text-foreground">{formatTime(label)}</p>
      {data.heartRate !== undefined && <p className="text-orange-500">{data.heartRate} bpm</p>}
      {data.paceSeconds !== undefined && (
        <p className="text-blue-500">
          {speedUnit === 'km_h'
            ? `${paceToKmh(data.paceSeconds / 60).toFixed(1)} km/h`
            : `${formatPaceMinSec(data.paceSeconds / 60)}/km`}
        </p>
      )}
      {data.altitude !== undefined && (
        <p className="text-muted-foreground">{Math.round(data.altitude)} m</p>
      )}
      {data.km !== undefined && <p className="text-muted-foreground">{data.km.toFixed(2)} km</p>}
    </div>
  )
}

export default function SessionCurvesChart({
  heartRateCurve,
  paceCurve,
  altitudeCurve,
  speedUnit,
  hrZoneThresholds,
}: SessionCurvesChartProps) {
  const { t } = useTranslation()
  const [showAltitude, setShowAltitude] = useState(true)

  const hasCurves =
    (heartRateCurve && heartRateCurve.length > 0) ||
    (paceCurve && paceCurve.length > 0) ||
    (altitudeCurve && altitudeCurve.length > 0)

  if (!hasCurves) return null

  const data = mergeDataPoints(heartRateCurve, paceCurve, altitudeCurve, speedUnit)

  const hasHR = heartRateCurve && heartRateCurve.length > 0
  const hasPace = paceCurve && paceCurve.length > 0
  const hasAlt = altitudeCurve && altitudeCurve.length > 0

  const hrDomain: [number | string, number | string] = (() => {
    if (!hasHR || !hrZoneThresholds) return ['auto', 'auto']
    const hrValues = heartRateCurve.map((p) => p.value)
    const dataMin = Math.min(...hrValues)
    const dataMax = Math.max(...hrValues)
    const zoneMin = Math.min(...hrZoneThresholds.map((z) => z.minBpm))
    const zoneMax = Math.max(...hrZoneThresholds.map((z) => z.maxBpm))
    return [Math.min(dataMin, zoneMin), Math.max(dataMax, zoneMax)]
  })()

  const paceLabel = speedUnit === 'km_h' ? 'km/h' : 'min/km'

  return (
    <div className="space-y-2">
      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        {hasHR && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 rounded bg-orange-500" />
            {t('sessions.show.curveLegendHr')}
          </span>
        )}
        {hasPace && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 rounded bg-blue-500" />
            {t('sessions.show.curveLegendPace', { unit: paceLabel })}
          </span>
        )}
        {hasAlt && (
          <button
            type="button"
            onClick={() => setShowAltitude((v) => !v)}
            className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${showAltitude ? '' : 'opacity-40'}`}
          >
            <span className="inline-block w-6 h-2 rounded bg-gray-400 dark:bg-gray-500" />
            {t('sessions.show.curveLegendAltitude')}
          </button>
        )}
      </div>

      {/* Légende zones FC */}
      {hasHR && hrZoneThresholds && hrZoneThresholds.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
          {hrZoneThresholds.map((z) => (
            <span key={z.zone} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: ZONE_COLORS[z.zone], opacity: 0.8 }}
              />
              <span className="font-medium text-foreground">Z{z.zone}</span>
              {z.minBpm}–{z.maxBpm} bpm
            </span>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />

          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />

          {/* Axe Y gauche — FC (bpm) */}
          {hasHR && (
            <YAxis
              yAxisId="hr"
              orientation="left"
              domain={hrDomain}
              tick={{ fontSize: 11, fill: '#f97316' }}
              tickLine={false}
              axisLine={false}
              width={40}
              unit=" bpm"
              padding={{ top: 10, bottom: 10 }}
            />
          )}

          {/* Axe Y droit — allure */}
          {hasPace && (
            <YAxis
              yAxisId="pace"
              orientation="right"
              reversed={speedUnit === 'min_km'}
              tick={{ fontSize: 11, fill: '#3b82f6' }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) =>
                speedUnit === 'min_km' ? formatPaceMinSec(v) : v.toFixed(1)
              }
              unit={speedUnit === 'km_h' ? ' km/h' : ''}
              padding={{ top: 10, bottom: 10 }}
            />
          )}

          {/* Bandes de zones FC en arrière-plan */}
          {hasHR &&
            hrZoneThresholds?.map((z) => (
              <ReferenceArea
                key={z.zone}
                yAxisId="hr"
                y1={z.minBpm}
                y2={z.maxBpm}
                fill={ZONE_COLORS[z.zone]}
                fillOpacity={0.25}
                strokeOpacity={0}
              />
            ))}

          {/* Altitude en arrière-plan */}
          {hasAlt && showAltitude && (
            <Area
              yAxisId={hasHR ? 'hr' : hasPace ? 'pace' : 'hr'}
              dataKey="altitude"
              fill="hsl(var(--muted))"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              opacity={0.4}
              dot={false}
              isAnimationActive={false}
              name="altitude"
            />
          )}

          {/* Courbe FC */}
          {hasHR && (
            <Line
              yAxisId="hr"
              dataKey="heartRate"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="heartRate"
            />
          )}

          {/* Courbe allure */}
          {hasPace && (
            <Line
              yAxisId="pace"
              dataKey="pace"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="pace"
            />
          )}

          <Tooltip content={<CustomTooltip speedUnit={speedUnit} />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
