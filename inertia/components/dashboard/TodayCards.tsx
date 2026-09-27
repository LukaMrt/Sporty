import { Link } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import { sportIcon } from '~/lib/sports'
import { formatPace as formatPaceFromDuration, formatSwimDistance } from '~/lib/format'
import Term from '~/components/shared/Term'
import InsightItem from '~/components/analysis/InsightItem'
import ChartTooltip from '~/components/analysis/ChartTooltip'
import {
  DISTANCE_KEYS,
  formatMinutes,
  formatNumber,
  formatSeconds,
  formatSigned,
  longDate,
  shortDate,
} from '~/components/analysis/format'
import type { TodayOverview } from '../../../app/use_cases/dashboard/get_today_overview'

const READINESS_DOT = {
  good: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  low: 'bg-rose-500',
  unknown: 'bg-muted-foreground/40',
} as const

function Card({
  title,
  link,
  className = '',
  children,
}: {
  title: string
  link?: { href: string; label: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`rounded-xl border bg-card p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {link && (
          <Link
            href={link.href}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {link.label}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** « Comment je vais ? » : conseil du jour, fraîcheur et forme du jour */
export function TodayFormCard({
  form,
  children,
}: {
  form: TodayOverview['form']
  /** Prochaine séance du plan, affichée sous le conseil */
  children?: React.ReactNode
}) {
  const { t, locale } = useTranslation()
  const tsb = form.current ? Math.round(form.current.trainingStressBalance) : null
  const level = form.readiness.level

  return (
    <Card title={t('dashboard.today.title')} className="lg:col-span-2">
      <p className="text-lg leading-snug font-semibold">
        {form.advice
          ? t(`dashboard.today.advice.${form.advice}.title`)
          : t('dashboard.today.noData')}
      </p>
      {form.advice && (
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`dashboard.today.advice.${form.advice}.detail`)}
        </p>
      )}
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {tsb !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">
              <Term id="tsb">{t('dashboard.today.freshness')}</Term>
            </dt>
            <dd className="font-semibold tabular-nums">{formatSigned(tsb, locale, 0)}</dd>
          </div>
        )}
        {level !== 'unknown' && (
          <div>
            <dt className="text-xs text-muted-foreground">
              <Term id="readiness">{t('dashboard.today.readiness')}</Term>
            </dt>
            <dd className="flex items-center gap-1.5 font-semibold">
              <span className={`h-2 w-2 rounded-full ${READINESS_DOT[level]}`} aria-hidden="true" />
              {t(`analysis.recovery.levels.${level}`)}
            </dd>
          </div>
        )}
        {form.watchScore && (
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('dashboard.today.watchScore', {
                score: t(`analysis.recovery.scores.${form.watchScore.field}`),
              })}
            </dt>
            <dd className="font-semibold tabular-nums">
              {formatNumber(form.watchScore.value, locale, 0)}
            </dd>
          </div>
        )}
        {form.current && (
          <div>
            <dt className="text-xs text-muted-foreground">
              <Term id="ctl">{t('dashboard.today.fitness')}</Term>
            </dt>
            <dd className="font-semibold tabular-nums">
              {Math.round(form.current.chronicTrainingLoad)}
              {form.delta28 !== null && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({t('dashboard.today.delta28', { delta: formatSigned(form.delta28, locale) })})
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
      {children && <div className="mt-4">{children}</div>}
    </Card>
  )
}

/** « Ma semaine » : 7 jours, séances faites et prévues, avancement du volume */
export function WeekCard({ week, today }: { week: TodayOverview['week']; today: string }) {
  const { t, locale } = useTranslation()
  const target = week.plannedMinutes ?? week.typicalMinutes
  const progress =
    target && target > 0 ? Math.min(100, Math.round((week.doneMinutes / target) * 100)) : null

  return (
    <Card
      title={t('dashboard.week.title')}
      link={{ href: '/sessions', label: t('dashboard.week.all') }}
    >
      <ol className="grid grid-cols-7 gap-1 text-center">
        {week.days.map((day) => {
          const isToday = day.date === today
          const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString(locale, {
            weekday: 'narrow',
          })
          const pending = day.planned.filter((p) => p.status === 'pending')
          return (
            <li
              key={day.date}
              className={`flex min-h-16 flex-col items-center gap-1 rounded-lg p-1 ${
                isToday ? 'bg-primary/10 ring-1 ring-primary/40' : ''
              }`}
            >
              <span
                className={`text-xs ${isToday ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
              >
                {weekday}
              </span>
              {day.sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  title={`${formatMinutes(s.durationMinutes)}${s.distanceKm ? ` · ${formatNumber(s.distanceKm, locale)} km` : ''}`}
                  className="text-base leading-none"
                >
                  {sportIcon(s.sportSlug)}
                </Link>
              ))}
              {day.sessions.length === 0 &&
                pending.map((p, i) => (
                  <span
                    key={i}
                    title={`${p.title ?? t(`planning.sessions.types.${p.sessionType}`)} · ${p.minutes} min`}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-primary/60 text-xs opacity-70"
                  >
                    {sportIcon(p.sportSlug)}
                  </span>
                ))}
            </li>
          )
        })}
      </ol>
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold tabular-nums">{formatMinutes(week.doneMinutes)}</span>
          <span className="text-xs text-muted-foreground">
            {week.plannedMinutes !== null
              ? t('dashboard.week.planned', { minutes: formatMinutes(week.plannedMinutes) })
              : week.typicalMinutes !== null
                ? t('dashboard.week.typical', { minutes: formatMinutes(week.typicalMinutes) })
                : ''}
          </span>
        </div>
        {progress !== null && (
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('dashboard.week.progress')}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        )}
        {week.doneLoad > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('dashboard.week.load', { load: week.doneLoad })}
          </p>
        )}
      </div>
    </Card>
  )
}

/** Tendance de forme sur 6 semaines */
export function FormTrendCard({ form }: { form: TodayOverview['form'] }) {
  const { t, locale } = useTranslation()
  if (form.trend.length < 2) return null
  const dateLabel = (d: string) => shortDate(d, locale)

  return (
    <Card
      title={t('dashboard.trend.title')}
      link={{ href: '/analysis?tab=load', label: t('dashboard.trend.more') }}
    >
      {form.delta28 !== null && (
        <p className="mb-2 text-sm">
          {t(
            form.delta28 >= 3
              ? 'dashboard.trend.rising'
              : form.delta28 <= -3
                ? 'dashboard.trend.falling'
                : 'dashboard.trend.stable',
            { delta: formatSigned(form.delta28, locale) }
          )}
        </p>
      )}
      <div className="h-36" role="img" aria-label={t('dashboard.trend.chartLabel')}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={form.trend}>
            <XAxis dataKey="date" tickFormatter={dateLabel} fontSize={10} minTickGap={40} />
            <YAxis fontSize={10} width={28} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Tooltip
              content={
                <ChartTooltip
                  labelFormat={dateLabel}
                  valueFormat={(v) => formatNumber(v, locale)}
                />
              }
            />
            <Line
              dataKey="ctl"
              name={t('dashboard.today.fitness')}
              stroke="#2563eb"
              dot={false}
              strokeWidth={2}
            />
            <Line
              dataKey="tsb"
              name={t('dashboard.today.freshness')}
              stroke="#16a34a"
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

/** Dernière séance, avec un repère d'efficacité si c'était une sortie facile */
export function LastSessionCard({
  session,
}: {
  session: NonNullable<TodayOverview['lastSession']>
}) {
  const { t, locale } = useTranslation()
  const swim = session.sportSlug === 'swimming'
  const pace =
    session.sportSlug === 'running' && session.distanceKm
      ? formatPaceFromDuration(session.durationMinutes, session.distanceKm)
      : null

  return (
    <Card
      title={t('dashboard.last.title')}
      link={{ href: `/sessions/${session.id}`, label: t('dashboard.last.open') }}
    >
      <p className="text-sm">
        <span className="mr-1">{sportIcon(session.sportSlug)}</span>
        {t(`analysis.sports.${session.sportSlug}`)} · {longDate(session.date, locale)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">{t('dashboard.last.duration')}</dt>
          <dd className="font-semibold tabular-nums">{formatMinutes(session.durationMinutes)}</dd>
        </div>
        {session.distanceKm !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">{t('dashboard.last.distance')}</dt>
            <dd className="font-semibold tabular-nums">
              {swim
                ? formatSwimDistance(session.distanceKm)
                : `${formatNumber(session.distanceKm, locale)} km`}
            </dd>
          </div>
        )}
        {pace && (
          <div>
            <dt className="text-xs text-muted-foreground">{t('dashboard.last.pace')}</dt>
            <dd className="font-semibold tabular-nums">{pace}</dd>
          </div>
        )}
        {session.avgHeartRate !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">{t('dashboard.last.heartRate')}</dt>
            <dd className="font-semibold tabular-nums">{Math.round(session.avgHeartRate)} bpm</dd>
          </div>
        )}
        {session.trainingLoad !== null && (
          <div>
            <dt className="text-xs text-muted-foreground">
              <Term id="tss">{t('dashboard.last.load')}</Term>
            </dt>
            <dd className="font-semibold tabular-nums">
              {formatNumber(session.trainingLoad, locale, 0)} TSS
            </dd>
          </div>
        )}
      </dl>
      {session.efficiencyVsAverage !== null && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t(
            session.efficiencyVsAverage >= 0 ? 'dashboard.last.efBetter' : 'dashboard.last.efWorse',
            {
              percent: formatNumber(Math.abs(session.efficiencyVsAverage), locale),
            }
          )}
        </p>
      )}
    </Card>
  )
}

/** À retenir : les constats principaux et les records récents */
export function InsightsCard({
  insights,
  records,
}: {
  insights: TodayOverview['insights']
  records: TodayOverview['recentRecords']
}) {
  const { t } = useTranslation()
  if (insights.length === 0 && records.length === 0) return null

  return (
    <Card
      title={t('dashboard.insights.title')}
      link={{ href: '/analysis', label: t('dashboard.insights.more') }}
    >
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.distance}>
            <Link
              href={`/sessions/${r.sessionId}`}
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:underline"
            >
              🏅{' '}
              {t('analysis.highlights.record', {
                distance: t(`analysis.distances.${DISTANCE_KEYS[r.distance]}`),
                time: formatSeconds(r.seconds),
              })}
            </Link>
          </li>
        ))}
        {insights.map((insight, i) => (
          <li key={`${insight.id}-${i}`}>
            <InsightItem insight={insight} compact />
          </li>
        ))}
      </ul>
    </Card>
  )
}
