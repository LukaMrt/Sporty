import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import type { PlannedSession } from '~/types/planning'

interface Props {
  session: PlannedSession
  onClose: () => void
}

export default function EditSessionSheet({ session, onClose }: Props) {
  const { t } = useTranslation()
  const [duration, setDuration] = useState(String(session.targetDurationMinutes))
  const [pace, setPace] = useState(session.targetPacePerKm ?? '')
  const [saving, setSaving] = useState(false)

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const parsedDuration = Number.parseInt(duration, 10)
    if (!parsedDuration || parsedDuration <= 0) return

    const payload: Record<string, unknown> = {
      target_duration_minutes: parsedDuration,
    }
    if (pace.trim()) payload.target_pace_per_km = pace.trim()

    setSaving(true)
    router.put(`/planning/sessions/${session.id}`, payload, {
      preserveScroll: true,
      onSuccess: () => onClose(),
      onFinish: () => setSaving(false),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label htmlFor="duration">{t('planning.overview.durationLabel')}</Label>
        <Input
          id="duration"
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pace">{t('planning.overview.paceLabel')}</Label>
        <Input
          id="pace"
          type="text"
          placeholder="5:30"
          pattern="\d{1,2}:\d{2}"
          value={pace}
          onChange={(e) => setPace(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? t('planning.overview.saving') : t('planning.overview.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          {t('planning.overview.close')}
        </Button>
      </div>
    </form>
  )
}
