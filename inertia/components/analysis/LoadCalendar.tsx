import { useMemo } from 'react'
import { Link } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { ChartBlock, Section, formatNumber, longDate, type AnalysisData } from './shared'

/** Paliers de couleur selon la charge du jour (TSS) */
const LEVELS = [
  { min: 0, className: 'bg-muted' },
  { min: 1, className: 'bg-emerald-200' },
  { min: 40, className: 'bg-emerald-400' },
  { min: 80, className: 'bg-emerald-600' },
  { min: 130, className: 'bg-emerald-800' },
] as const

function level(tss: number): string {
  return [...LEVELS].reverse().find((l) => tss >= l.min)!.className
}

type Day = AnalysisData['calendar'][number]

/** F1 · Calendrier en carte de chaleur (style GitHub), une case par jour, lundi en haut */
export default function LoadCalendar({ calendar }: { calendar: AnalysisData['calendar'] }) {
  const { t, locale } = useTranslation()

  const weeks = useMemo(() => {
    const out: (Day | null)[][] = []
    let current: (Day | null)[] = []
    for (const day of calendar) {
      const dow = (new Date(`${day.date}T00:00:00`).getDay() + 6) % 7
      if (current.length === 0 && dow > 0) current = Array.from({ length: dow }, () => null)
      current.push(day)
      if (dow === 6) {
        out.push(current)
        current = []
      }
    }
    if (current.length > 0) out.push(current)
    return out
  }, [calendar])

  // Nom du mois au-dessus de la première semaine qui le contient
  const monthLabels = weeks.map((week, i) => {
    const first = week.find((d) => d !== null)
    if (!first) return ''
    const month = first.date.slice(0, 7)
    const prev = i > 0 ? weeks[i - 1].find((d) => d !== null)?.date.slice(0, 7) : null
    return month !== prev
      ? new Date(`${first.date}T00:00:00`).toLocaleDateString(locale, { month: 'short' })
      : ''
  })
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    // 2024-01-01 est un lundi
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, {
      weekday: 'narrow',
      timeZone: 'UTC',
    })
  )
  const activeDays = calendar.filter((d) => d.tss > 0).length

  return (
    <Section
      id="calendar"
      title={t('analysis.calendar.title')}
      description={t('analysis.calendar.description', { days: activeDays })}
      empty={calendar.length === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      <ChartBlock title={t('analysis.calendar.chart')} help="calendar">
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex gap-1">
            <div className="flex flex-col gap-[3px] pt-4 pr-1 text-[10px] leading-3 text-muted-foreground">
              {weekdayLabels.map((d, i) => (
                <span key={i} className={`h-3 ${i % 2 === 1 ? 'invisible' : ''}`}>
                  {d}
                </span>
              ))}
            </div>
            {weeks.map((week, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                <span className="h-3 text-[10px] leading-3 whitespace-nowrap text-muted-foreground">
                  {monthLabels[i]}
                </span>
                {week.map((day, j) =>
                  day === null ? (
                    <span key={`empty-${j}`} className="block h-3 w-3" aria-hidden="true" />
                  ) : day.sessionId === null ? (
                    <span
                      key={day.date}
                      title={longDate(day.date, locale)}
                      className={`block h-3 w-3 rounded-sm ${level(day.tss)}`}
                    />
                  ) : (
                    <Link
                      key={day.date}
                      href={`/sessions/${day.sessionId}`}
                      title={`${longDate(day.date, locale)} — ${formatNumber(day.tss, locale, 0)} TSS`}
                      aria-label={`${longDate(day.date, locale)} : ${formatNumber(day.tss, locale, 0)} TSS`}
                      className={`block h-3 w-3 rounded-sm ${level(day.tss)} hover:ring-2 hover:ring-primary/50`}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {LEVELS.map((l, i) => (
            <span key={l.min} className="flex items-center gap-1">
              <span className={`h-3 w-3 rounded-sm ${l.className}`} aria-hidden="true" />
              {i === 0
                ? t('analysis.calendar.rest')
                : i === LEVELS.length - 1
                  ? `≥ ${l.min}`
                  : `${l.min}–${LEVELS[i + 1].min - 1}`}
            </span>
          ))}
          <span>TSS</span>
        </div>
      </ChartBlock>
    </Section>
  )
}
