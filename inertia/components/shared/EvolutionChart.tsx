import React, { useState } from 'react'
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
import { formatChartDate, formatChartValue } from '~/lib/format'

function isoWeek(iso: string): string {
  const d = new Date(iso)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const year = d.getFullYear()
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

type Metric = 'pace' | 'heartRate' | 'distance'

interface MergedPoint {
  date: string
  value: number | null
  trend: number | null
}

function buildMergedData(data: ChartDataPoint[], metric: Metric): MergedPoint[] {
  // Agréger la tendance par semaine
  const weekMap = new Map<string, { sum: number; count: number; firstDate: string }>()
  for (const point of data) {
    const key = isoWeek(point.date)
    const v = point[metric]
    if (v === null) continue
    if (!weekMap.has(key)) weekMap.set(key, { sum: 0, count: 0, firstDate: point.date })
    const entry = weekMap.get(key)!
    entry.sum += v
    entry.count++
  }

  const trendByDate = new Map<string, number>()
  for (const { sum, count, firstDate } of weekMap.values()) {
    trendByDate.set(firstDate, sum / count)
  }

  return data.map((point) => ({
    date: point.date,
    value: point[metric],
    trend: trendByDate.get(point.date) ?? null,
  }))
}

const METRICS: { key: Metric; label: string }[] = [
  { key: 'pace', label: 'Allure' },
  { key: 'heartRate', label: 'FC' },
  { key: 'distance', label: 'Distance' },
]

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
}

function CustomTooltip({ active, payload, label, activeMetric }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded border bg-background px-3 py-2 text-sm shadow">
      <p className="mb-1 font-medium">{formatChartDate(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === 'trend' ? 'Tendance : ' : ''}
          {formatChartValue(entry.value, activeMetric)}
        </p>
      ))}
    </div>
  )
}

interface EvolutionChartProps {
  data: ChartDataPoint[]
  defaultMetric?: Metric
}

export default function EvolutionChart({ data, defaultMetric = 'pace' }: EvolutionChartProps) {
  const [activeMetric, setActiveMetric] = useState<Metric>(defaultMetric)

  const filteredData = data.filter((point) => point[activeMetric] !== null)
  const mergedData = buildMergedData(filteredData, activeMetric)

  const rawValues = filteredData.map((p) => p[activeMetric] as number)
  const rawMin = Math.min(...rawValues)
  const rawMax = Math.max(...rawValues)
  const padding = (rawMax - rawMin) * 0.2 || 1
  const yDomain: [number, number] = [Math.max(0, rawMin - padding), rawMax + padding]

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
              value:
                activeMetric === 'pace' ? 'min/km' : activeMetric === 'heartRate' ? 'bpm' : 'km',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: 10, fill: 'var(--color-muted-foreground)' },
            }}
            domain={yDomain}
            tickFormatter={(v: number) => {
              if (activeMetric === 'pace') {
                const m = Math.floor(v)
                const s = Math.round((v - m) * 60)
                return `${m}'${s.toString().padStart(2, '0')}`
              }
              return Math.round(v).toString()
            }}
          />
          <Tooltip content={<CustomTooltip activeMetric={activeMetric} />} />
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
