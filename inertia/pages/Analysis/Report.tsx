import React from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import { formatSeconds, Stat } from '~/components/analysis/shared'
import type GetPeriodReport from '../../../app/use_cases/analysis/get_period_report'

type Report = Awaited<ReturnType<GetPeriodReport['execute']>>

const DISTANCE_KEYS: Record<number, string> = {
  400: '400m',
  1000: '1k',
  1609: 'mile',
  5000: '5k',
  10000: '10k',
  21097: 'half',
  42195: 'marathon',
}

function delta(current: number, previous: number): string | undefined {
  if (previous === 0) return undefined
  const pct = Math.round(((current - previous) / previous) * 100)
  return `${pct >= 0 ? '+' : ''}${pct} %`
}

/** H2 · Bilan hebdomadaire ou mensuel avec faits saillants */
export default function AnalysisReport({ report }: { report: Report }) {
  const { t, locale } = useTranslation()
  const go = (params: Record<string, string>) =>
    router.get('/analysis/report', { period: report.period, ...params }, { preserveScroll: true })
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale)
  const { totals, previousTotals } = report
  const ef = report.efficiency

  return (
    <>
      <Head title={t('analysis.periodReport.title')} />
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('analysis.title')}
        </Link>

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t('analysis.periodReport.previous')}
              onClick={() => go({ date: report.previousDate })}
              className="rounded-md p-1 hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">
              {fmt(report.from)} – {fmt(report.to)}
            </h1>
            <button
              type="button"
              aria-label={t('analysis.periodReport.next')}
              onClick={() => go({ date: report.nextDate })}
              className="rounded-md p-1 hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div role="group" className="flex gap-1 rounded-lg bg-muted p-1">
            {(['week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={report.period === p}
                onClick={() => router.get('/analysis/report', { period: p })}
                className={`rounded-md px-3 py-1 text-sm ${report.period === p ? 'bg-background shadow-sm' : ''}`}
              >
                {t(`analysis.periodReport.periods.${p}`)}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label={t('analysis.periodReport.sessions')}
            value={totals.sessions}
            hint={delta(totals.sessions, previousTotals.sessions)}
          />
          <Stat
            label={t('analysis.periodReport.distance')}
            value={`${totals.distanceKm} km`}
            hint={delta(totals.distanceKm, previousTotals.distanceKm)}
          />
          <Stat
            label={t('analysis.periodReport.duration')}
            value={formatSeconds(totals.durationMinutes * 60)}
            hint={delta(totals.durationMinutes, previousTotals.durationMinutes)}
          />
          <Stat
            label={t('analysis.periodReport.load')}
            value={`${totals.load} TSS`}
            hint={delta(totals.load, previousTotals.load)}
          />
        </div>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">{t('analysis.periodReport.highlights')}</h2>
          <ul className="space-y-1 text-sm">
            {report.records.map((r) => (
              <li key={r.distance}>
                🏅{' '}
                {t('analysis.periodReport.record', {
                  distance: t(`analysis.distances.${DISTANCE_KEYS[r.distance]}`),
                  time: formatSeconds(r.seconds),
                })}{' '}
                <Link href={`/sessions/${r.sessionId}`} className="text-primary hover:underline">
                  {fmt(r.date)}
                </Link>
              </li>
            ))}
            {report.longest && (
              <li>
                {t('analysis.periodReport.longest', { distance: report.longest.distanceKm })}{' '}
                <Link
                  href={`/sessions/${report.longest.id}`}
                  className="text-primary hover:underline"
                >
                  {fmt(report.longest.date)}
                </Link>
              </li>
            )}
            {report.period === 'month' && report.busiestWeek && (
              <li>
                {t('analysis.periodReport.busiestWeek', {
                  week: fmt(report.busiestWeek.week),
                  load: report.busiestWeek.load,
                })}
              </li>
            )}
            {report.lowIntensityShare !== null && (
              <li>{t('analysis.periodReport.intensity', { percent: report.lowIntensityShare })}</li>
            )}
            {ef.length >= 2 && (
              <li>
                {t('analysis.periodReport.efficiency', {
                  from: ef[0].ef,
                  to: ef[ef.length - 1].ef,
                })}
              </li>
            )}
            {totals.sessions === 0 && <li>{t('analysis.empty.noSessions')}</li>}
          </ul>
        </section>
      </div>
    </>
  )
}

AnalysisReport.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
