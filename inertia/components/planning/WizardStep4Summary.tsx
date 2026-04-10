import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import {
  defaultDuration,
  weeksUntilDate,
  type WizardState,
} from '~/components/planning/wizard_types'

interface Props {
  state: WizardState
  generating: boolean
  onGenerate: () => void
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default function WizardStep4Summary({ state, generating, onGenerate }: Props) {
  const { t } = useTranslation()

  const planDuration = state.eventDate
    ? weeksUntilDate(state.eventDate)
    : (state.planDurationWeeks ?? defaultDuration(state.distanceKm ?? 10, state.vdot ?? 35))

  return (
    <div className="space-y-5">
      <h2 className="font-medium">{t('planning.wizard.step5.title')}</h2>

      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('planning.wizard.step5.goalSection')}
        </h3>
        <SummaryRow label={t('planning.wizard.step5.distance')} value={`${state.distanceKm} km`} />
        <SummaryRow
          label={t('planning.wizard.step5.targetTime')}
          value={
            state.targetTimeMinutes
              ? `${state.targetTimeMinutes} min`
              : t('planning.wizard.step5.noTargetTime')
          }
        />
        <SummaryRow
          label={t('planning.wizard.step5.eventDate')}
          value={state.eventDate ?? t('planning.wizard.step5.noEventDate')}
        />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('planning.wizard.step5.levelSection')}
        </h3>
        <SummaryRow label={t('planning.wizard.step5.vdot')} value={String(state.vdot)} />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('planning.wizard.step5.planSection')}
        </h3>
        <SummaryRow
          label={t('planning.wizard.step5.sessionsPerWeek')}
          value={`${state.sessionsPerWeek}×`}
        />
        <SummaryRow
          label={t('planning.wizard.step5.preferredDays')}
          value={state.preferredDays.map((d) => t(`planning.wizard.step4.days.${d}`)).join(', ')}
        />
        <SummaryRow
          label={t('planning.wizard.step5.planDuration')}
          value={t('planning.wizard.step5.planDurationWeeks').replace(
            '{{n}}',
            String(planDuration)
          )}
        />
      </section>

      <Button size="lg" className="w-full" onClick={onGenerate} disabled={generating}>
        {generating ? t('planning.wizard.nav.generating') : t('planning.wizard.nav.generate')}
      </Button>
    </div>
  )
}
