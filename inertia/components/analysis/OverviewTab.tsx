import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { Check, Circle } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'
import { sportIcon } from '~/lib/sports'
import { formatSwimDistance } from '~/lib/format'
import InsightItem from './InsightItem'
import GoalOutlookCard from './GoalOutlookCard'
import ReportSection from './ReportSection'
import {
  DISTANCE_KEYS,
  Section,
  Stat,
  formatMinutes,
  formatNumber,
  formatSeconds,
  formatSigned,
  longDate,
  monthLabel,
  shortDate,
  type AnalysisData,
} from './shared'

/** Constats visibles d'emblée ; les autres restent à un clic */
const VISIBLE_INSIGHTS = 5

function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null
}

/** Onglet « En bref » : ce qu'il faut retenir de la période, en 30 secondes */
export default function OverviewTab({ analysis }: { analysis: AnalysisData }) {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const insights = showAll ? analysis.insights : analysis.insights.slice(0, VISIBLE_INSIGHTS)

  return (
    <div className="space-y-4">
      <Section
        id="essentials"
        title={t('analysis.overview.essentials')}
        description={t('analysis.overview.essentialsHint')}
        empty={analysis.insights.length === 0}
        emptyMessage={t('analysis.overview.noInsights')}
      >
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={`${insight.id}-${i}`}>
              <InsightItem insight={insight} />
            </li>
          ))}
        </ul>
        {analysis.insights.length > VISIBLE_INSIGHTS && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {showAll
              ? t('analysis.overview.showLess')
              : t('analysis.overview.showMore', {
                  count: analysis.insights.length - VISIBLE_INSIGHTS,
                })}
          </button>
        )}
      </Section>

      <KeyFigures analysis={analysis} />

      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.goal && <GoalOutlookCard goal={analysis.goal} />}
        <Highlights analysis={analysis} />
      </div>

      <UnlockChecklist analysis={analysis} />

      <ReportSection summary={analysis.claudeSummary} />
    </div>
  )
}

function KeyFigures({ analysis }: { analysis: AnalysisData }) {
  const { t, locale } = useTranslation()
  const { current, comparison } = analysis.totals
  const compareLabel = t(`analysis.filters.compareShort.${analysis.filters.compare}`)

  const delta = (now: number, before: number | undefined, unit = '%') => {
    if (before === undefined) return undefined
    const change = unit === '%' ? percentChange(now, before) : now - before
    if (change === null) return undefined
    return {
      text: `${formatSigned(change, locale, 0)}${unit === '%' ? ' %' : ''} ${compareLabel}`,
      favorable: null,
    }
  }

  // Distances : jamais additionnées entre sports
  const distances = Object.entries(current.distanceBySport).sort((a, b) => b[1] - a[1])

  return (
    <Section id="figures" title={t('analysis.overview.figures')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label={t('analysis.overview.sessions')}
          value={current.sessions}
          delta={delta(current.sessions, comparison?.sessions, 'abs')}
          hint={t('analysis.overview.perWeek', {
            count: formatNumber(analysis.regularity.sessionsPerWeek, locale),
          })}
        />
        <Stat
          label={t('analysis.overview.duration')}
          value={formatMinutes(current.durationMinutes)}
          delta={delta(current.durationMinutes, comparison?.durationMinutes)}
        />
        <Stat
          label={t('analysis.overview.load')}
          value={`${formatNumber(current.load, locale, 0)} TSS`}
          delta={delta(current.load, comparison?.load)}
        />
        <Stat
          label={t('analysis.overview.distance')}
          value={
            distances.length === 0 ? (
              '—'
            ) : (
              <span className="flex flex-col text-base leading-snug">
                {distances.slice(0, 3).map(([sport, km]) => (
                  <span key={sport}>
                    {sportIcon(sport)}{' '}
                    {sport === 'swimming'
                      ? formatSwimDistance(km)
                      : `${formatNumber(km, locale)} km`}
                  </span>
                ))}
              </span>
            )
          }
        />
      </div>
    </Section>
  )
}

function Highlights({ analysis }: { analysis: AnalysisData }) {
  const { t, locale } = useTranslation()
  const h = analysis.highlights
  const r = analysis.regularity
  const items: { key: string; content: React.ReactNode }[] = []

  for (const record of h.newRecords) {
    items.push({
      key: `record-${record.distance}`,
      content: (
        <Link href={`/sessions/${record.sessionId}`} className="hover:underline">
          🏅{' '}
          {t('analysis.highlights.record', {
            distance: t(`analysis.distances.${DISTANCE_KEYS[record.distance]}`),
            time: formatSeconds(record.seconds),
          })}
        </Link>
      ),
    })
  }
  if (h.longest) {
    items.push({
      key: 'longest',
      content: (
        <Link href={`/sessions/${h.longest.id}`} className="hover:underline">
          {sportIcon(h.longest.sportSlug)}{' '}
          {t('analysis.highlights.longest', {
            duration: formatMinutes(h.longest.durationMinutes),
            date: shortDate(h.longest.date, locale),
          })}
        </Link>
      ),
    })
  }
  if (h.biggestWeek && h.biggestWeek.load > 0) {
    items.push({
      key: 'week',
      content: t('analysis.highlights.biggestWeek', {
        week: shortDate(h.biggestWeek.week, locale),
        load: h.biggestWeek.load,
        duration: formatMinutes(h.biggestWeek.durationMinutes),
      }),
    })
  }
  if (h.mostActiveMonth) {
    items.push({
      key: 'month',
      content: t('analysis.highlights.month', {
        month: monthLabel(h.mostActiveMonth.month, locale),
        duration: formatMinutes(h.mostActiveMonth.durationMinutes),
        sessions: h.mostActiveMonth.sessions,
      }),
    })
  }
  if (r.longestStreak >= 2) {
    items.push({
      key: 'streak',
      content: t('analysis.highlights.streak', {
        weeks: r.longestStreak,
        current: r.currentStreak,
      }),
    })
  }

  return (
    <Section
      id="highlights"
      title={t('analysis.highlights.title')}
      empty={items.length === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.key}>{item.content}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {t('analysis.highlights.period', {
          from: longDate(analysis.from, locale),
          to: longDate(analysis.to, locale),
        })}
      </p>
    </Section>
  )
}

/**
 * États vides transformés en guide : ce qui manque, ce que ça débloque et où
 * le régler. Masqué dès que tout est en place.
 */
function UnlockChecklist({ analysis }: { analysis: AnalysisData }) {
  const { t } = useTranslation()
  const c = analysis.coverage
  const items = [
    { key: 'maxHr', done: c.hasMaxHr, href: '/profile' },
    { key: 'heartRate', done: c.hasHeartRateSessions, href: '/connectors' },
    { key: 'gps', done: c.hasGps, href: '/connectors' },
    { key: 'wellness', done: analysis.hasWellness, href: '/connectors' },
    { key: 'goal', done: c.hasGoal, href: '/planning/goal' },
  ]
  if (items.every((i) => i.done)) return null

  return (
    <Section
      id="unlock"
      title={t('analysis.unlock.title')}
      description={t('analysis.unlock.description')}
    >
      <ul className="divide-y text-sm">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-3 py-2">
            {item.done ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <Circle
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className={item.done ? 'text-muted-foreground line-through' : 'font-medium'}>
                {t(`analysis.unlock.items.${item.key}.label`)}
              </p>
              {!item.done && (
                <p className="text-xs text-muted-foreground">
                  {t(`analysis.unlock.items.${item.key}.unlocks`)}
                </p>
              )}
            </div>
            {!item.done && (
              <Link href={item.href} className="shrink-0 text-xs text-primary hover:underline">
                {t(`analysis.unlock.items.${item.key}.cta`)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
