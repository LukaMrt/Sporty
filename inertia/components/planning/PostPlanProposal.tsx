import React from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'

interface Props {
  trainingState: string
  _goalDistanceKm?: number | null
}

interface ProposalOption {
  titleKey: string
  descKey: string
  action: () => void
  variant: 'primary' | 'secondary' | 'ghost'
}

export default function PostPlanProposal({ trainingState }: Props) {
  const { t } = useTranslation()

  const showTransition = trainingState === 'preparation'

  const options: ProposalOption[] = [
    ...(showTransition
      ? [
          {
            titleKey: 'planning.postPlan.transition.title',
            descKey: 'planning.postPlan.transition.desc',
            action: () => router.post('/planning/transition'),
            variant: 'primary' as const,
          },
        ]
      : []),
    {
      titleKey: 'planning.postPlan.maintenance.title',
      descKey: 'planning.postPlan.maintenance.desc',
      action: () => router.post('/planning/maintenance'),
      variant: showTransition ? 'secondary' : 'primary',
    },
    {
      titleKey: 'planning.postPlan.newGoal.title',
      descKey: 'planning.postPlan.newGoal.desc',
      action: () => router.visit('/planning/goal'),
      variant: 'secondary',
    },
  ]

  return (
    <div className="max-w-sm mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">{t('planning.postPlan.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('planning.postPlan.subtitle')}</p>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.titleKey}
            onClick={option.action}
            className={[
              'w-full text-left rounded-xl border p-4 transition-colors space-y-1 cursor-pointer',
              option.variant === 'primary'
                ? 'border-primary bg-primary/5 hover:bg-primary/10'
                : 'border-border bg-card hover:bg-muted/40',
            ].join(' ')}
          >
            <div className="font-medium text-foreground">{t(option.titleKey)}</div>
            <div className="text-sm text-muted-foreground">{t(option.descKey)}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => router.post('/planning/abandon')}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer"
      >
        {t('planning.postPlan.later')}
      </button>
    </div>
  )
}
