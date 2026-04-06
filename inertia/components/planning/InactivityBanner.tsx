import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import type { InactivityLevel } from '~/types/planning'

interface InactivityBannerProps {
  level: InactivityLevel
  daysSince: number
  onDismiss: () => void
  onResume: () => void
}

export default function InactivityBanner({
  level,
  daysSince,
  onDismiss,
  onResume,
}: InactivityBannerProps) {
  const { t } = useTranslation()

  if (level === 'none') return null

  const isCritical = level === 'critical'

  function handleResume() {
    onResume()
    router.post(
      '/planning/resume-from-inactivity',
      { days_since: daysSince },
      { preserveScroll: false }
    )
  }

  function handleNewPlan() {
    router.post('/planning/abandon-for-new-plan', {}, { preserveScroll: false })
  }

  return (
    <div
      className={[
        'rounded-xl border px-4 py-4 space-y-3',
        isCritical ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            'text-base flex-shrink-0 mt-0.5',
            isCritical ? 'text-amber-500' : 'text-blue-400',
          ].join(' ')}
        >
          {isCritical ? '⏸' : '💤'}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={[
              'text-sm font-medium',
              isCritical ? 'text-amber-900' : 'text-blue-900',
            ].join(' ')}
          >
            {isCritical
              ? t('planning.inactivity.critical.title', { days: daysSince })
              : t('planning.inactivity.warning.title', { days: daysSince })}
          </p>
          <p
            className={['text-xs mt-0.5', isCritical ? 'text-amber-700' : 'text-blue-700'].join(
              ' '
            )}
          >
            {isCritical
              ? t('planning.inactivity.critical.message')
              : t('planning.inactivity.warning.message')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleResume}
          className={[
            'cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
            isCritical
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          ].join(' ')}
        >
          {t('planning.inactivity.actions.resume')}
        </button>
        <button
          onClick={handleNewPlan}
          className={[
            'cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
            isCritical
              ? 'border-amber-300 text-amber-800 hover:bg-amber-100'
              : 'border-blue-300 text-blue-800 hover:bg-blue-100',
          ].join(' ')}
        >
          {t('planning.inactivity.actions.newPlan')}
        </button>
        <button
          onClick={onDismiss}
          className="cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {t('planning.inactivity.actions.later')}
        </button>
      </div>
    </div>
  )
}
