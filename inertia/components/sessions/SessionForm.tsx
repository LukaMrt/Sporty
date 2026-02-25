import React, { useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import FormField from '~/components/forms/FormField'
import { EFFORT_EMOJIS } from '~/lib/effort'

interface Sport {
  id: number
  name: string
  slug: string
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
  durationMinutes: number | '',
  distanceKm: number | '',
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
  })

  const pace = computeSpeed(form.data.duration_minutes, form.data.distance_km, speedUnit)

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
    }
    if (mode === 'create') {
      form.transform(() => payload)
      form.post('/sessions', { onSuccess: onClose })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sport */}
      <FormField label="Sport *" htmlFor="sport_id" error={form.errors.sport_id}>
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
      <FormField label="Date *" htmlFor="date" error={form.errors.date}>
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
        label="Durée (minutes) *"
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
      <FormField label="Distance (km)" htmlFor="distance_km" error={form.errors.distance_km}>
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
          {speedUnit === 'km_h' ? 'Vitesse' : 'Allure'} :{' '}
          <span className="font-medium text-foreground">{pace}</span>
        </p>
      )}

      {/* Section Plus de détails */}
      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Plus de détails
        {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {detailsOpen && (
        <div className="space-y-4 border-l-2 border-muted pl-3">
          {/* FC moyenne */}
          <FormField
            label="FC moyenne (bpm)"
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
            <Label>Ressenti</Label>
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
                    aria-label={`Ressenti ${val}`}
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
          <FormField label="Notes libres" htmlFor="notes" error={form.errors.notes}>
            <Textarea
              id="notes"
              placeholder="Quelques notes sur cette séance..."
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
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={form.processing}>
          {form.processing ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
