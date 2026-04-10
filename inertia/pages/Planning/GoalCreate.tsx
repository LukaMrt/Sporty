import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ChevronLeft } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import { pushToast } from '~/hooks/use_toast'
import VdotEstimationForm, {
  type VdotEstimationResult,
} from '~/components/planning/VdotEstimationForm'
import WizardStep1Goal from '~/components/planning/WizardStep1Goal'
import WizardStep3Parameters from '~/components/planning/WizardStep3Parameters'
import WizardStep4Summary from '~/components/planning/WizardStep4Summary'
import {
  defaultDuration,
  weeksUntilDate,
  type DayKey,
  type WizardState,
} from '~/components/planning/wizard_types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCsrf(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({
  current,
  total,
  onGoTo,
}: {
  current: number
  total: number
  onGoTo: (i: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => i < current && onGoTo(i)}
          className={`rounded-full transition-all ${
            i === current
              ? 'w-8 h-2.5 bg-primary'
              : i < current
                ? 'w-2.5 h-2.5 bg-primary/40 cursor-pointer hover:bg-primary/70'
                : 'w-2.5 h-2.5 bg-muted-foreground/30 cursor-default'
          }`}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GoalCreate() {
  const { t } = useTranslation()

  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)

  const [state, setState] = useState<WizardState>({
    distanceKm: null,
    targetTimeMinutes: null,
    eventDate: null,
    vdot: null,
    paceZones: null,
    sessionsPerWeek: 4,
    preferredDays: ['tue', 'thu', 'sat'],
    planDurationWeeks: null,
  })

  const STEP_LABELS = [
    t('planning.wizard.steps.goal'),
    t('planning.wizard.steps.vdotEstimation'),
    t('planning.wizard.steps.parameters'),
    t('planning.wizard.steps.summary'),
  ]

  // ── Handlers ─────────────────────────────────────────────────────────────

  function onStep1Commit(
    data: Pick<WizardState, 'distanceKm' | 'targetTimeMinutes' | 'eventDate'>
  ) {
    setState((s) => ({ ...s, ...data }))
    setStep(1)
  }

  function onVdotEstimated(result: VdotEstimationResult) {
    setState((s) => ({ ...s, vdot: result.vdot, paceZones: result.paceZones }))
    setStep(2)
  }

  function onSessionsChange(n: 3 | 4 | 5) {
    setState((s) => ({ ...s, sessionsPerWeek: n, preferredDays: s.preferredDays.slice(0, n) }))
  }

  function onToggleDay(day: DayKey) {
    setState((s) => {
      if (s.preferredDays.includes(day))
        return { ...s, preferredDays: s.preferredDays.filter((d) => d !== day) }
      if (s.preferredDays.length < s.sessionsPerWeek)
        return { ...s, preferredDays: [...s.preferredDays, day] }
      return s
    })
  }

  function onApplyDefaults() {
    const vdot = state.vdot ?? 35
    const km = state.distanceKm ?? 10
    setState((s) => ({
      ...s,
      sessionsPerWeek: 4 as const,
      preferredDays: (['tue', 'thu', 'sat', 'sun'] as DayKey[]).slice(0, 4),
      planDurationWeeks: state.eventDate
        ? weeksUntilDate(state.eventDate)
        : defaultDuration(km, vdot),
    }))
  }

  // DAY_KEYS index → JS getDay() number (mon=1 … sat=6, sun=0)
  const DAY_TO_NUM: Record<string, number> = {
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 0,
  }

  async function generate() {
    if (!state.distanceKm || !state.vdot) return
    const planDurationWeeks =
      state.planDurationWeeks ??
      (state.eventDate
        ? weeksUntilDate(state.eventDate)
        : defaultDuration(state.distanceKm, state.vdot))
    setGenerating(true)
    try {
      const csrf = getCsrf()
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf,
        'Accept': 'application/json',
      }

      // Step 1 — create goal
      const goalRes = await fetch('/planning/goals', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_distance_km: state.distanceKm,
          target_time_minutes: state.targetTimeMinutes ?? null,
          event_date: state.eventDate ?? null,
        }),
      })
      if (!goalRes.ok) {
        const err = (await goalRes.json()) as { message?: string }
        pushToast(err.message ?? 'Erreur création objectif', 'error')
        return
      }

      // Step 2 — generate plan
      const planRes = await fetch('/planning/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vdot: state.vdot,
          sessions_per_week: state.sessionsPerWeek,
          preferred_days: state.preferredDays.map((d) => DAY_TO_NUM[d]),
          plan_duration_weeks: planDurationWeeks,
        }),
      })
      if (planRes.ok) {
        pushToast(t('planning.wizard.step5.successToast'), 'success')
        router.visit('/planning')
      } else {
        const err = (await planRes.json()) as { message?: string }
        pushToast(err.message ?? 'Erreur génération plan', 'error')
      }
    } catch {
      pushToast('Erreur réseau', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Head title={t('planning.wizard.title')} />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : router.visit('/planning'))}
            className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">{t('planning.wizard.title')}</h1>
        </div>

        <div className="space-y-2">
          <ProgressDots current={step} total={4} onGoTo={setStep} />
          <p className="text-center text-xs text-muted-foreground">{STEP_LABELS[step]}</p>
        </div>

        {step === 0 && <WizardStep1Goal onCommit={onStep1Commit} />}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-medium">{t('planning.wizard.step2.title')}</h2>
            <VdotEstimationForm onConfirm={onVdotEstimated} />
          </div>
        )}

        {step === 2 && (
          <WizardStep3Parameters
            state={state}
            onSessionsChange={onSessionsChange}
            onToggleDay={onToggleDay}
            onDurationChange={(weeks) => setState((s) => ({ ...s, planDurationWeeks: weeks }))}
            onApplyDefaults={onApplyDefaults}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <WizardStep4Summary
            state={state}
            generating={generating}
            onGenerate={() => void generate()}
          />
        )}
      </div>
    </>
  )
}

GoalCreate.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
