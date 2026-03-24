import React from 'react'
import { useTranslation } from '~/hooks/use_translation'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import { formatBlockDuration } from '~/lib/format'
import { ZONE_COLORS } from '~/lib/planning_colors'
import type { IntervalBlock } from '~/types/planning'

function parsePaceString(pace: string): number {
  const [min, sec] = pace.split(':').map(Number)
  return min + (sec ?? 0) / 60
}

interface IntervalBreakdownProps {
  intervals: IntervalBlock[]
}

export default function IntervalBreakdown({ intervals }: IntervalBreakdownProps) {
  const { t } = useTranslation()
  const { formatSpeed } = useUnitConversion()

  return (
    <div className="space-y-0">
      {intervals.map((block, idx) => (
        <div key={idx} className="flex items-stretch gap-3">
          {/* Rail */}
          <div className="flex flex-col items-center w-4 flex-shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full mt-3 flex-shrink-0 ${ZONE_COLORS[block.intensityZone] ?? 'bg-muted-foreground'}`}
            />
            {idx < intervals.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>

          {/* Block content */}
          <div className="pb-3 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-foreground capitalize">
                {t(`planning.overview.blockTypes.${block.type}`)}
              </span>
              {block.repetitions > 1 && (
                <span className="text-xs text-muted-foreground">×{block.repetitions}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
              {block.durationMinutes && <span>{formatBlockDuration(block.durationMinutes)}</span>}
              {block.distanceMeters && <span>{block.distanceMeters} m</span>}
              {block.targetPace && <span>@ {formatSpeed(parsePaceString(block.targetPace))}</span>}
              {block.recoveryDurationMinutes && (
                <span className="text-muted-foreground/60">
                  · {t('planning.overview.rest').toLowerCase()}{' '}
                  {formatBlockDuration(block.recoveryDurationMinutes)}{' '}
                  {block.recoveryType === 'jog'
                    ? t('planning.overview.recoveryJog')
                    : t('planning.overview.recoveryRest')}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
