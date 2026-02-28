import React, { useMemo, useState } from 'react'
import { useTranslation } from '~/hooks/use_translation'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartDataPoint } from '../../../app/domain/entities/dashboard_metrics'
import { formatChartDate, formatPaceMinSec, isThisMonth, isThisWeek, isoWeek } from '~/lib/format'
import type { Period } from './PeriodSelector'
import { useUnitConversion } from '~/hooks/use_unit_conversion'

type Metric = 'pace' | 'heartRate' | 'distance'

interface MergedPoint {
  date: string
  value: number | null
  trend: number | null
}

function buildMergedData(data: ChartDataPoint[], metric: Metric): MergedPoint[] {
  // Agréger la tendance par semaine
  const weekMap = new Map<
    string,
    { sum: number; count: number; firstDate: string; lastDate: string }
  >()
  for (const point of data) {
    const key = isoWeek(point.date)
    const v = point[metric]
    if (v === null) continue
    if (!weekMap.has(key))
      weekMap.set(key, { sum: 0, count: 0, firstDate: point.date, lastDate: point.date })
    const entry = weekMap.get(key)!
    entry.sum += v
    entry.count++
    entry.lastDate = point.date
  }

  const trendByDate = new Map<string, number>()
  const weeks = [...weekMap.values()]
  weeks.forEach(({ sum, count, firstDate, lastDate }, i) => {
    const avg = sum / count
    trendByDate.set(firstDate, avg)
    // Pour la dernière semaine, ancrer aussi sur le dernier point pour que la courbe s'étende jusqu'au bout
    if (i === weeks.length - 1 && lastDate !== firstDate) {
      trendByDate.set(lastDate, avg)
    }
  })

  return data.map((point) => ({
    date: point.date,
    value: point[metric],
    trend: trendByDate.get(point.date) ?? null,
  }))
}

interface TooltipPayloadItem {
  value: number
  dataKey: string
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  activeMetric: Metric
  formatValue: (v: number) => string
}

function CustomTooltip({
  active,
  payload,
  label,
  activeMetric: _activeMetric,
  formatValue,
}: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded border bg-background px-3 py-2 text-sm shadow">
      <p className="mb-1 font-medium">{formatChartDate(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === 'trend' ? 'Tendance : ' : ''}
          {formatValue(entry.value)}
        </p>
      ))}
    </div>
  )
}

interface EvolutionChartProps {
  data: ChartDataPoint[]
  defaultMetric?: Metric
  period?: Period
}

export default function EvolutionChart({
  data,
  defaultMetric = 'pace',
  period = 'all',
}: EvolutionChartProps) {
  const [activeMetric, setActiveMetric] = useState<Metric>(defaultMetric)
  const { convertPaceForChart, formatSpeed, speedUnit } = useUnitConversion()
  const { t } = useTranslation()

  const METRICS: { key: Metric; label: string }[] = [
    { key: 'pace', label: t('dashboard.chart.metrics.pace') },
    { key: 'heartRate', label: t('dashboard.chart.metrics.heartRate') },
    { key: 'distance', label: t('dashboard.chart.metrics.distance') },
  ]

  const periodFiltered = useMemo(() => {
    if (period === 'week') return data.filter((p) => isThisWeek(p.date))
    if (period === 'month') return data.filter((p) => isThisMonth(p.date))
    return data
  }, [data, period])

  // Convert pace values to km/h before passing to Recharts (useMemo avoids unnecessary re-renders)
  const convertedData = useMemo(() => {
    if (activeMetric !== 'pace' || speedUnit === 'min_km') return periodFiltered
    return periodFiltered.map((point) => ({
      ...point,
      pace: point.pace !== null ? convertPaceForChart(point.pace) : null,
    }))
  }, [periodFiltered, activeMetric, speedUnit, convertPaceForChart])

  const filteredData = convertedData.filter((point) => point[activeMetric] !== null)
  const mergedData = buildMergedData(filteredData, activeMetric)

  let yDomain: [number, number]
  if (filteredData.length === 0) {
    yDomain = [0, 1]
  } else {
    const rawValues = filteredData.map((p) => p[activeMetric] as number)
    const rawMin = Math.min(...rawValues)
    const rawMax = Math.max(...rawValues)
    const padding = (rawMax - rawMin) * 0.2 || 1
    yDomain = [Math.max(0, rawMin - padding), rawMax + padding]
  }

  const yAxisLabel =
    activeMetric === 'pace'
      ? speedUnit === 'km_h'
        ? 'km/h'
        : 'min/km'
      : activeMetric === 'heartRate'
        ? 'bpm'
        : 'km'

  const formatYTick = (v: number): string => {
    if (activeMetric === 'pace') {
      if (speedUnit === 'km_h') return v.toFixed(1)
      return formatPaceMinSec(v)
    }
    return Math.round(v).toString()
  }

  const formatTooltipValue = (v: number): string => {
    if (activeMetric === 'pace') {
      // chart data is already converted: v is in km/h or min/km depending on speedUnit
      if (speedUnit === 'km_h') return `${v.toFixed(1)} km/h`
      return formatSpeed(v)
    }
    if (activeMetric === 'heartRate') return `${Math.round(v)} bpm`
    return `${v.toFixed(1)} km`
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {METRICS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveMetric(key)}
            className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              activeMetric === key
                ? 'bg-primary text-primary-foreground'
                : 'border border-input bg-background text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={mergedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            width={55}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: 10, fill: 'var(--color-muted-foreground)' },
            }}
            domain={yDomain}
            tickFormatter={formatYTick}
          />
          <Tooltip
            content={<CustomTooltip activeMetric={activeMetric} formatValue={formatTooltipValue} />}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeOpacity={0.4}
            dot={{ r: 2 }}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
