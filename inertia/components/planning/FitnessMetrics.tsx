import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import InfoTooltip from '~/components/shared/InfoTooltip'

interface FitnessMetricsProps {
  ctl: number
  atl: number
  tsb: number
  acwr: number
}

function AcwrBadge({ acwr, t }: { acwr: number; t: (k: string) => string }) {
  if (acwr <= 0.8)
    return (
      <span className="text-xs text-blue-600">{t('planning.athlete.fitness.badges.acwr.low')}</span>
    )
  if (acwr <= 1.3)
    return (
      <span className="text-xs text-green-600">
        {t('planning.athlete.fitness.badges.acwr.optimal')}
      </span>
    )
  return (
    <span className="text-xs text-orange-600">
      {t('planning.athlete.fitness.badges.acwr.high')}
    </span>
  )
}

function TsbBadge({ tsb, t }: { tsb: number; t: (k: string) => string }) {
  if (tsb < -20)
    return (
      <span className="text-xs text-orange-600">
        {t('planning.athlete.fitness.badges.tsb.tired')}
      </span>
    )
  if (tsb < -10)
    return (
      <span className="text-xs text-yellow-600">
        {t('planning.athlete.fitness.badges.tsb.slightlyTired')}
      </span>
    )
  if (tsb <= 5)
    return (
      <span className="text-xs text-green-600">
        {t('planning.athlete.fitness.badges.tsb.neutral')}
      </span>
    )
  return (
    <span className="text-xs text-blue-600">{t('planning.athlete.fitness.badges.tsb.fresh')}</span>
  )
}

function AcwrBar({ acwr }: { acwr: number }) {
  const clampedPct = Math.min(Math.max((acwr / 2) * 100, 0), 100)
  const color =
    acwr <= 0.8
      ? 'bg-blue-400'
      : acwr <= 1.3
        ? 'bg-green-500'
        : acwr <= 1.5
          ? 'bg-orange-500'
          : 'bg-red-600'

  return (
    <div className="mt-1 space-y-1">
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="absolute h-full bg-green-100" style={{ left: '40%', width: '25%' }} />
        <div
          className={`absolute h-full w-1 rounded-full ${color} transition-all`}
          style={{ left: `calc(${clampedPct}% - 2px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span className="text-green-600">0.8 – 1.3</span>
        <span>2</span>
      </div>
    </div>
  )
}

export default function FitnessMetrics({ ctl, atl, tsb, acwr }: FitnessMetricsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* CTL */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t('planning.athlete.fitness.ctl.label')}
          </span>
          {' — '}
          {t('planning.athlete.fitness.ctl.name')}
          <InfoTooltip
            description={t('planning.athlete.fitness.ctl.description')}
            interpretation={t('planning.athlete.fitness.ctl.interpretation')}
          />
        </div>
        <div className="text-2xl font-bold">{ctl}</div>
      </div>

      {/* ATL */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t('planning.athlete.fitness.atl.label')}
          </span>
          {' — '}
          {t('planning.athlete.fitness.atl.name')}
          <InfoTooltip
            description={t('planning.athlete.fitness.atl.description')}
            interpretation={t('planning.athlete.fitness.atl.interpretation')}
          />
        </div>
        <div className="text-2xl font-bold">{atl}</div>
      </div>

      {/* TSB */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t('planning.athlete.fitness.tsb.label')}
          </span>
          {' — '}
          {t('planning.athlete.fitness.tsb.name')}
          <InfoTooltip
            description={t('planning.athlete.fitness.tsb.description')}
            interpretation={t('planning.athlete.fitness.tsb.interpretation')}
          />
        </div>
        <div className="text-2xl font-bold">{tsb > 0 ? `+${tsb}` : tsb}</div>
        <TsbBadge tsb={tsb} t={t} />
      </div>

      {/* ACWR */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t('planning.athlete.fitness.acwr.label')}
          </span>
          {' — '}
          {t('planning.athlete.fitness.acwr.name')}
          <InfoTooltip
            description={t('planning.athlete.fitness.acwr.description')}
            interpretation={t('planning.athlete.fitness.acwr.interpretation')}
          >
            <AcwrBar acwr={acwr} />
          </InfoTooltip>
        </div>
        <div className="text-2xl font-bold">{acwr}</div>
        <AcwrBadge acwr={acwr} t={t} />
      </div>
    </div>
  )
}
