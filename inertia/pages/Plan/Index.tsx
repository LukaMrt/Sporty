import React, { useMemo } from 'react'
import { Head, Link, router, useForm } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import type ImportedPlan from '../../../app/use_cases/imported_plan/imported_plan'

type Calendar = Awaited<ReturnType<ImportedPlan['calendar']>>

const STATUS_STYLES: Record<Calendar['days'][number]['status'], string> = {
  done: 'border-emerald-300 bg-emerald-50',
  missed: 'border-rose-300 bg-rose-50',
  upcoming: 'border-sky-200 bg-sky-50',
  extra: 'border-amber-200 bg-amber-50',
  rest: 'border-transparent bg-muted/30',
}

const EXAMPLE = `- 2026-03-02 : Footing 45 min (Z2)
- 2026-03-04 : Seuil 3 × 10 min 12 km
- 2026-03-07 : Sortie longue 1h30`

/**
 * H3 · Plan rédigé dans Claude, collé ici et affiché face aux séances
 * réellement faites (remplace à terme le générateur interne).
 */
export default function PlanIndex({ calendar }: { calendar: Calendar }) {
  const { t, locale } = useTranslation()
  const form = useForm({ plan: '' })

  const weeks = useMemo(() => {
    const out: Calendar['days'][] = []
    for (let i = 0; i < calendar.days.length; i += 7) out.push(calendar.days.slice(i, i + 7))
    return out
  }, [calendar.days])

  return (
    <>
      <Head title={t('plan.title')} />
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">{t('plan.title')}</h1>
          {calendar.adherence !== null && (
            <span className="text-sm text-muted-foreground">
              {t('plan.adherence', { percent: calendar.adherence })}
            </span>
          )}
        </header>

        {calendar.hasPlan && (
          <div className="space-y-2 overflow-x-auto">
            {weeks.map((week) => (
              <div key={week[0].date} className="grid min-w-[700px] grid-cols-7 gap-2">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`min-h-24 rounded-lg border p-2 text-xs ${STATUS_STYLES[day.status]} ${day.date === calendar.today ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="mb-1 font-medium text-muted-foreground">
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString(locale, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    {day.planned.map((p) => (
                      <div key={p.id} title={p.notes ?? undefined} className="font-medium">
                        {p.title}
                      </div>
                    ))}
                    {day.done.map((s) => (
                      <Link
                        key={s.id}
                        href={`/sessions/${s.id}`}
                        className="block text-emerald-800 hover:underline"
                      >
                        ✓{' '}
                        {s.distanceKm
                          ? `${s.distanceKm.toFixed(1)} km`
                          : `${s.durationMinutes} min`}
                      </Link>
                    ))}
                    {day.status === 'missed' && (
                      <div className="text-rose-700">{t('plan.missed')}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.post('/plan', { onSuccess: () => form.reset() })
          }}
          className="space-y-2 rounded-xl border bg-card p-4"
        >
          <label htmlFor="plan" className="text-sm font-medium">
            {t('plan.importLabel')}
          </label>
          <p className="text-xs text-muted-foreground">{t('plan.importHelp')}</p>
          <textarea
            id="plan"
            rows={8}
            value={form.data.plan}
            onChange={(e) => form.setData('plan', e.target.value)}
            placeholder={EXAMPLE}
            className="w-full rounded-md border bg-background p-2 font-mono text-xs"
          />
          {form.errors.plan && <p className="text-xs text-destructive">{form.errors.plan}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={form.processing}>
              {t('plan.import')}
            </Button>
            {calendar.hasPlan && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (window.confirm(t('plan.clearConfirm'))) router.post('/plan/clear')
                }}
              >
                {t('plan.clear')}
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}

PlanIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
