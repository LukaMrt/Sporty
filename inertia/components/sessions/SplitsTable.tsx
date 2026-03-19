import { Zap } from 'lucide-react'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import { useTranslation } from '~/hooks/use_translation'
import type { KmSplit } from '../../../app/domain/value_objects/run_metrics'

interface SplitsTableProps {
  splits: KmSplit[] | undefined
}

export default function SplitsTable({ splits }: SplitsTableProps) {
  const { formatSpeed } = useUnitConversion()
  const { t } = useTranslation()

  if (!splits || splits.length === 0) return null

  // Le split le plus rapide parmi les splits complets uniquement
  const fullSplits = splits.filter((s) => !s.partial)
  const fastestPace = fullSplits.length > 0 ? Math.min(...fullSplits.map((s) => s.paceSeconds)) : -1

  const hasHr = splits.some((s) => s.avgHeartRate !== undefined)
  const hasElevation = splits.some((s) => s.elevationGain !== undefined)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="text-left pb-2 font-medium">{t('sessions.show.splitsKm')}</th>
            <th className="text-right pb-2 font-medium">{t('sessions.show.splitsPace')}</th>
            {hasHr && (
              <th className="text-right pb-2 font-medium">{t('sessions.show.splitsHr')}</th>
            )}
            {hasElevation && (
              <th className="text-right pb-2 font-medium">{t('sessions.show.splitsElevation')}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => {
            const isFastest = !split.partial && split.paceSeconds === fastestPace
            return (
              <tr
                key={split.km}
                className={`border-b last:border-0 ${isFastest ? 'bg-accent/10' : ''}`}
              >
                <td className="py-1.5 text-foreground font-medium flex items-center gap-1">
                  {split.km}
                  {split.partial && <span className="ml-1 text-xs text-muted-foreground">*</span>}
                  {isFastest && <Zap size={12} className="text-amber-500 ml-1" />}
                </td>
                <td className="py-1.5 text-right text-foreground">
                  {formatSpeed(split.paceSeconds / 60)}
                </td>
                {hasHr && (
                  <td className="py-1.5 text-right text-muted-foreground">
                    {split.avgHeartRate !== undefined ? `${split.avgHeartRate} bpm` : '—'}
                  </td>
                )}
                {hasElevation && (
                  <td className="py-1.5 text-right text-muted-foreground">
                    {split.elevationGain !== undefined ? `+${split.elevationGain} m` : '—'}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {splits.some((s) => s.partial) && (
        <p className="mt-2 text-xs text-muted-foreground">{t('sessions.show.splitsPartialNote')}</p>
      )}
    </div>
  )
}
