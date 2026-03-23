import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import { DISTANCE_SHORTCUTS, type WizardState } from '~/components/planning/wizard_types'

interface Props {
  onCommit: (data: Pick<WizardState, 'distanceKm' | 'targetTimeMinutes' | 'eventDate'>) => void
}

export default function WizardStep1Goal({ onCommit }: Props) {
  const { t } = useTranslation()
  const [distanceInput, setDistanceInput] = useState('')
  const [targetTimeInput, setTargetTimeInput] = useState('')
  const [eventDateInput, setEventDateInput] = useState('')

  function commit() {
    const km = Number.parseFloat(distanceInput)
    if (!km || km <= 0) return
    const minutes = targetTimeInput.trim() ? Number(targetTimeInput) : null
    onCommit({
      distanceKm: km,
      targetTimeMinutes: minutes && minutes > 0 ? minutes : null,
      eventDate: eventDateInput.trim() || null,
    })
  }

  return (
    <div className="space-y-5">
      <h2 className="font-medium">{t('planning.wizard.step1.title')}</h2>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('planning.wizard.step1.distance')}
        </label>
        <div className="flex flex-wrap gap-2">
          {DISTANCE_SHORTCUTS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setDistanceInput(String(value))}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                distanceInput === String(value)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={distanceInput}
            onChange={(e) => setDistanceInput(e.target.value)}
            placeholder={t('planning.wizard.step1.distancePlaceholder')}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <span className="text-sm text-muted-foreground">
            {t('planning.wizard.step1.distanceUnit')}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {t('planning.wizard.step1.targetTime')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={targetTimeInput}
            onChange={(e) => setTargetTimeInput(e.target.value)}
            placeholder={t('planning.wizard.step1.targetTimePlaceholder')}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('planning.wizard.step1.targetTimeHint')}</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {t('planning.wizard.step1.eventDate')}
        </label>
        <input
          type="date"
          value={eventDateInput}
          onChange={(e) => setEventDateInput(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">{t('planning.wizard.step1.eventDateHint')}</p>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!distanceInput || Number.parseFloat(distanceInput) <= 0}
        onClick={commit}
      >
        {t('planning.wizard.nav.next')}
      </Button>
    </div>
  )
}
