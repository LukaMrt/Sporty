import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import {
  DAY_KEYS,
  defaultDuration,
  weeksUntilDate,
  type DayKey,
  type WizardState,
} from '~/components/planning/wizard_types'

interface Props {
  state: WizardState
  onSessionsChange: (n: 3 | 4 | 5) => void
  onToggleDay: (day: DayKey) => void
  onDurationChange: (weeks: number | null) => void
  onApplyDefaults: () => void
  onNext: () => void
}

export default function WizardStep3Parameters({
  state,
  onSessionsChange,
  onToggleDay,
  onDurationChange,
  onApplyDefaults,
  onNext,
}: Props) {
  const { t } = useTranslation()

  const planDuration = state.eventDate
    ? weeksUntilDate(state.eventDate)
    : (state.planDurationWeeks ?? defaultDuration(state.distanceKm ?? 10, state.vdot ?? 35))

  return (
    <div className="space-y-5">
      <h2 className="font-medium">{t('planning.wizard.step4.title')}</h2>

      {/* Sessions per week */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('planning.wizard.step4.sessionsPerWeek')}
        </label>
        <div className="flex gap-2">
          {([3, 4, 5] as const).map((n) => (
            <button
              key={n}
              onClick={() => onSessionsChange(n)}
              className={`flex-1 rounded-lg border py-3 text-sm font-semibold transition-colors cursor-pointer ${
                state.sessionsPerWeek === n
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              {n}×
            </button>
          ))}
        </div>
      </div>

      {/* Preferred days */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('planning.wizard.step4.preferredDays')}
        </label>
        <p className="text-xs text-muted-foreground">
          {t('planning.wizard.step4.preferredDaysHint').replace(
            '{{n}}',
            String(state.sessionsPerWeek)
          )}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_KEYS.map((day) => {
            const selected = state.preferredDays.includes(day)
            const disabled = !selected && state.preferredDays.length >= state.sessionsPerWeek
            return (
              <button
                key={day}
                onClick={() => onToggleDay(day)}
                disabled={disabled}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                {t(`planning.wizard.step4.days.${day}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Plan duration */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {t('planning.wizard.step4.planDuration')}
        </label>
        {state.eventDate ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            <span className="font-semibold">{planDuration}</span>
            <span className="text-muted-foreground text-xs">
              {t('planning.wizard.step4.planDurationLocked')}
            </span>
          </div>
        ) : (
          <input
            type="number"
            min="1"
            max="52"
            value={state.planDurationWeeks ?? planDuration}
            onChange={(e) => onDurationChange(Number(e.target.value) || null)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        )}
        {planDuration < 8 && (
          <p className="text-xs text-amber-600 font-medium">
            {t('planning.wizard.step4.planDurationWarning')}
          </p>
        )}
      </div>

      <Button variant="outline" size="lg" className="w-full" onClick={onApplyDefaults}>
        {t('planning.wizard.step4.defaultsBtn')}
      </Button>

      <Button size="lg" className="w-full" onClick={onNext}>
        {t('planning.wizard.nav.next')}
      </Button>
    </div>
  )
}
