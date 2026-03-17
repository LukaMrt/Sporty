import React, { useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import FormField from '~/components/forms/FormField'
import { EFFORT_EMOJIS } from '~/lib/effort'
import { useTranslation } from '~/hooks/use_translation'

interface Sport {
  id: number
  name: string
  slug: string
}

interface RunMetrics {
  minHeartRate?: number | null
  maxHeartRate?: number | null
  cadenceAvg?: number | null
  elevationGain?: number | null
  elevationLoss?: number | null
}

interface TrainingSession {
  id: number
  sportId: number
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  perceivedEffort: number | null
  notes: string | null
  sportMetrics?: RunMetrics | null
}

interface SessionFormProps {
  sports: Sport[]
  defaultSportId?: number
  speedUnit?: 'min_km' | 'km_h'
  onClose?: () => void
  mode: 'create' | 'edit'
  session?: TrainingSession
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function computeSpeed(
  durationMinutes: number | string,
  distanceKm: number | string,
  speedUnit: 'min_km' | 'km_h'
): string | null {
  const dur = Number(durationMinutes)
  const dist = Number(distanceKm)
  if (!dur || !dist || dist <= 0) return null
  if (speedUnit === 'km_h') {
    const kmh = (dist / dur) * 60
    return `${kmh.toFixed(1)} km/h`
  }
  const paceTotal = dur / dist
  const paceMin = Math.floor(paceTotal)
  const paceSec = Math.round((paceTotal % 1) * 60)
    .toString()
    .padStart(2, '0')
  return `${paceMin}'${paceSec}/km`
}

export default function SessionForm({
  sports,
  defaultSportId,
  speedUnit = 'min_km',
  onClose,
  mode,
  session,
}: SessionFormProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { t } = useTranslation()

  const form = useForm({
    sport_id: session?.sportId ?? defaultSportId ?? sports[0]?.id ?? 0,
    date: session?.date ?? todayIso(),
    duration_minutes: session ? String(session.durationMinutes) : '',
    distance_km:
      session?.distanceKm !== null && session?.distanceKm !== undefined
        ? String(session.distanceKm)
        : '',
    avg_heart_rate:
      session?.avgHeartRate !== null && session?.avgHeartRate !== undefined
        ? String(session.avgHeartRate)
        : '',
    perceived_effort:
      session?.perceivedEffort !== null && session?.perceivedEffort !== undefined
        ? String(session.perceivedEffort)
        : '',
    notes: session?.notes ?? '',
    min_heart_rate:
      session?.sportMetrics?.minHeartRate !== null &&
      session?.sportMetrics?.minHeartRate !== undefined
        ? String(session.sportMetrics.minHeartRate)
        : '',
    max_heart_rate:
      session?.sportMetrics?.maxHeartRate !== null &&
      session?.sportMetrics?.maxHeartRate !== undefined
        ? String(session.sportMetrics.maxHeartRate)
        : '',
    cadence_avg:
      session?.sportMetrics?.cadenceAvg !== null && session?.sportMetrics?.cadenceAvg !== undefined
        ? String(session.sportMetrics.cadenceAvg)
        : '',
    elevation_gain:
      session?.sportMetrics?.elevationGain !== null &&
      session?.sportMetrics?.elevationGain !== undefined
        ? String(session.sportMetrics.elevationGain)
        : '',
    elevation_loss:
      session?.sportMetrics?.elevationLoss !== null &&
      session?.sportMetrics?.elevationLoss !== undefined
        ? String(session.sportMetrics.elevationLoss)
        : '',
  })

  const pace = computeSpeed(form.data.duration_minutes, form.data.distance_km, speedUnit)
  const selectedSport = sports.find((s) => s.id === form.data.sport_id)
  const isRunning = selectedSport?.slug === 'running'

  function handleCancel() {
    if (onClose) {
      onClose()
    } else {
      router.visit('/sessions')
    }
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const payload = {
      sport_id: form.data.sport_id,
      date: form.data.date,
      duration_minutes: Number(form.data.duration_minutes),
      distance_km: form.data.distance_km !== '' ? Number(form.data.distance_km) : null,
      avg_heart_rate: form.data.avg_heart_rate !== '' ? Number(form.data.avg_heart_rate) : null,
      perceived_effort:
        form.data.perceived_effort !== '' ? Number(form.data.perceived_effort) : null,
      notes: form.data.notes !== '' ? form.data.notes : null,
      min_heart_rate: form.data.min_heart_rate !== '' ? Number(form.data.min_heart_rate) : null,
      max_heart_rate: form.data.max_heart_rate !== '' ? Number(form.data.max_heart_rate) : null,
      cadence_avg: form.data.cadence_avg !== '' ? Number(form.data.cadence_avg) : null,
      elevation_gain: form.data.elevation_gain !== '' ? Number(form.data.elevation_gain) : null,
      elevation_loss: form.data.elevation_loss !== '' ? Number(form.data.elevation_loss) : null,
    }
    if (mode === 'create') {
      form.transform(() => payload)
      form.post('/sessions', { onSuccess: onClose })
    } else {
      form.transform(() => payload)
      form.put(`/sessions/${session!.id}`, { onSuccess: onClose })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sport */}
      <FormField label={t('sessions.form.sport')} htmlFor="sport_id" error={form.errors.sport_id}>
        <select
          id="sport_id"
          value={form.data.sport_id}
          onChange={(e) => form.setData('sport_id', Number(e.target.value))}
          className="flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FormField>

      {/* Date */}
      <FormField label={t('sessions.form.date')} htmlFor="date" error={form.errors.date}>
        <Input
          id="date"
          type="date"
          value={form.data.date}
          onChange={(e) => form.setData('date', e.target.value)}
          className="cursor-pointer hover:border-ring transition-colors"
        />
      </FormField>

      {/* Durée */}
      <FormField
        label={t('sessions.form.duration')}
        htmlFor="duration_minutes"
        error={form.errors.duration_minutes}
      >
        <Input
          id="duration_minutes"
          type="number"
          min={1}
          placeholder="ex: 45"
          value={form.data.duration_minutes}
          onChange={(e) => form.setData('duration_minutes', e.target.value)}
        />
      </FormField>

      {/* Distance */}
      <FormField
        label={t('sessions.form.distance')}
        htmlFor="distance_km"
        error={form.errors.distance_km}
      >
        <Input
          id="distance_km"
          type="number"
          min={0}
          step={0.01}
          placeholder="ex: 10.5"
          value={form.data.distance_km}
          onChange={(e) => form.setData('distance_km', e.target.value)}
        />
      </FormField>

      {/* Vitesse / allure auto-calculée */}
      {pace && (
        <p className="text-sm text-muted-foreground">
          {speedUnit === 'km_h' ? t('sessions.form.speed') : t('sessions.form.pace')} :{' '}
          <span className="font-medium text-foreground">{pace}</span>
        </p>
      )}

      {/* Section Plus de détails */}
      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {t('sessions.form.moreDetails')}
        {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {detailsOpen && (
        <div className="space-y-4 border-l-2 border-muted pl-3">
          {/* Champs spécifiques course à pied */}
          {isRunning && (
            <>
              <FormField
                label={t('sessions.form.minHeartRate')}
                htmlFor="min_heart_rate"
                error={form.errors.min_heart_rate}
              >
                <Input
                  id="min_heart_rate"
                  type="number"
                  min={30}
                  max={250}
                  placeholder="ex: 55"
                  value={form.data.min_heart_rate}
                  onChange={(e) => form.setData('min_heart_rate', e.target.value)}
                />
              </FormField>
              <FormField
                label={t('sessions.form.maxHeartRate')}
                htmlFor="max_heart_rate"
                error={form.errors.max_heart_rate}
              >
                <Input
                  id="max_heart_rate"
                  type="number"
                  min={30}
                  max={250}
                  placeholder="ex: 175"
                  value={form.data.max_heart_rate}
                  onChange={(e) => form.setData('max_heart_rate', e.target.value)}
                />
              </FormField>
              <FormField
                label={t('sessions.form.cadenceAvg')}
                htmlFor="cadence_avg"
                error={form.errors.cadence_avg}
              >
                <Input
                  id="cadence_avg"
                  type="number"
                  min={50}
                  max={250}
                  placeholder="ex: 170"
                  value={form.data.cadence_avg}
                  onChange={(e) => form.setData('cadence_avg', e.target.value)}
                />
              </FormField>
              <FormField
                label={t('sessions.form.elevationGain')}
                htmlFor="elevation_gain"
                error={form.errors.elevation_gain}
              >
                <Input
                  id="elevation_gain"
                  type="number"
                  min={0}
                  max={10000}
                  placeholder="ex: 150"
                  value={form.data.elevation_gain}
                  onChange={(e) => form.setData('elevation_gain', e.target.value)}
                />
              </FormField>
              <FormField
                label={t('sessions.form.elevationLoss')}
                htmlFor="elevation_loss"
                error={form.errors.elevation_loss}
              >
                <Input
                  id="elevation_loss"
                  type="number"
                  min={0}
                  max={10000}
                  placeholder="ex: 150"
                  value={form.data.elevation_loss}
                  onChange={(e) => form.setData('elevation_loss', e.target.value)}
                />
              </FormField>
            </>
          )}

          {/* FC moyenne */}
          <FormField
            label={t('sessions.form.heartRate')}
            htmlFor="avg_heart_rate"
            error={form.errors.avg_heart_rate}
          >
            <Input
              id="avg_heart_rate"
              type="number"
              min={30}
              max={250}
              placeholder="ex: 145"
              value={form.data.avg_heart_rate}
              onChange={(e) => form.setData('avg_heart_rate', e.target.value)}
            />
          </FormField>

          {/* Ressenti */}
          <div className="space-y-1.5">
            <Label>{t('sessions.form.effort')}</Label>
            <div className="flex gap-2">
              {EFFORT_EMOJIS.map((emoji, i) => {
                const val = String(i + 1)
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      form.setData(
                        'perceived_effort',
                        form.data.perceived_effort === val ? '' : val
                      )
                    }
                    className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 text-xl transition-all hover:scale-110 ${
                      form.data.perceived_effort === val
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    aria-label={t('sessions.form.effortLabel', { value: val })}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
            {form.errors.perceived_effort && (
              <p className="text-xs text-destructive">{form.errors.perceived_effort}</p>
            )}
          </div>

          {/* Notes */}
          <FormField label={t('sessions.form.notes')} htmlFor="notes" error={form.errors.notes}>
            <Textarea
              id="notes"
              placeholder={t('sessions.form.notesPlaceholder')}
              maxLength={1000}
              value={form.data.notes}
              onChange={(e) => form.setData('notes', e.target.value)}
              rows={3}
            />
          </FormField>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
          {t('sessions.form.cancel')}
        </Button>
        <Button type="submit" className="flex-1" disabled={form.processing}>
          {form.processing ? t('sessions.form.saving') : t('sessions.form.save')}
        </Button>
      </div>
    </form>
  )
}
