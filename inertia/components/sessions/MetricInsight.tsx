import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import InfoTooltip from '~/components/shared/InfoTooltip'

interface Zone {
  labelKey: string
  color: string // classes Tailwind bg + text
  dot: string // classe Tailwind bg seule
  min: number
  max: number
}

interface MetricInsightConfig {
  descriptionKey: string
  unit: string
  zones: Zone[]
}

const DRIFT_ZONES: Zone[] = [
  {
    labelKey: 'sessions.show.insights.cardiacDrift.zones.excellent',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
    min: 0,
    max: 5,
  },
  {
    labelKey: 'sessions.show.insights.cardiacDrift.zones.normal',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    dot: 'bg-yellow-500',
    min: 5,
    max: 10,
  },
  {
    labelKey: 'sessions.show.insights.cardiacDrift.zones.high',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    dot: 'bg-orange-500',
    min: 10,
    max: 15,
  },
  {
    labelKey: 'sessions.show.insights.cardiacDrift.zones.critical',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
    min: 15,
    max: Infinity,
  },
]

const TRIMP_ZONES: Zone[] = [
  {
    labelKey: 'sessions.show.insights.trimp.zones.light',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    dot: 'bg-blue-400',
    min: 0,
    max: 100,
  },
  {
    labelKey: 'sessions.show.insights.trimp.zones.moderate',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
    min: 100,
    max: 200,
  },
  {
    labelKey: 'sessions.show.insights.trimp.zones.intense',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    dot: 'bg-yellow-500',
    min: 200,
    max: 300,
  },
  {
    labelKey: 'sessions.show.insights.trimp.zones.veryIntense',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
    min: 300,
    max: Infinity,
  },
]

export const METRIC_INSIGHTS: Record<string, MetricInsightConfig> = {
  cardiacDrift: {
    descriptionKey: 'sessions.show.insights.cardiacDrift.description',
    unit: '%',
    zones: DRIFT_ZONES,
  },
  trimp: {
    descriptionKey: 'sessions.show.insights.trimp.description',
    unit: 'pts',
    zones: TRIMP_ZONES,
  },
}

function getZone(zones: Zone[], value: number): Zone {
  return zones.find((z) => value >= z.min && value < z.max) ?? zones[zones.length - 1]
}

interface MetricInsightProps {
  metricKey: string
  value: number
  /** Affiche uniquement l'icône tooltip, sans le badge de zone */
  iconOnly?: boolean
}

export default function MetricInsight({ metricKey, value, iconOnly = false }: MetricInsightProps) {
  const { t } = useTranslation()
  const config = METRIC_INSIGHTS[metricKey]
  if (!config) return null

  const zone = getZone(config.zones, value)

  return (
    <div className="flex items-center gap-2">
      {!iconOnly && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${zone.color}`}>
          {t(zone.labelKey)}
        </span>
      )}
      <InfoTooltip description={t(config.descriptionKey)}>
        <div className="space-y-1">
          {config.zones.map((z) => (
            <div key={z.labelKey} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${z.dot}`} />
                <span className="text-foreground">{t(z.labelKey)}</span>
              </span>
              <span className="text-muted-foreground">
                {z.max === Infinity ? `> ${z.min}` : `${z.min} – ${z.max}`} {config.unit}
              </span>
            </div>
          ))}
        </div>
      </InfoTooltip>
    </div>
  )
}
