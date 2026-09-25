import { useMemo } from 'react'
import { Link } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { Section, type AnalysisData } from './shared'

/** Intensité de couleur selon le TSS du jour */
function level(tss: number): string {
  if (tss <= 0) return 'bg-muted'
  if (tss < 40) return 'bg-emerald-200'
  if (tss < 80) return 'bg-emerald-400'
  if (tss < 130) return 'bg-emerald-600'
  return 'bg-emerald-800'
}

/** F1 · Calendrier en carte de chaleur (style GitHub), une case par jour */
export default function LoadCalendar({ calendar }: { calendar: AnalysisData['calendar'] }) {
  const { t, locale } = useTranslation()

  // Colonnes = semaines (lundi en haut)
  const weeks = useMemo(() => {
    const out: { date: string; tss: number }[][] = []
    let current: { date: string; tss: number }[] = []
    for (const day of calendar) {
      const dow = (new Date(`${day.date}T00:00:00`).getDay() + 6) % 7
      if (dow === 0 && current.length > 0) {
        out.push(current)
        current = []
      }
      current.push(day)
    }
    if (current.length > 0) out.push(current)
    return out
  }, [calendar])

  return (
    <Section
      id="calendar"
      terms={['tss']}
      title={t('analysis.calendar.title')}
      empty={calendar.length === 0}
      emptyMessage={t('analysis.empty.noSessions')}
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-[3px]">
          {weeks.map((week) => (
            <div key={week[0].date} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <Link
                  key={day.date}
                  href={`/sessions?date=${day.date}`}
                  title={`${new Date(`${day.date}T00:00:00`).toLocaleDateString(locale)} — ${Math.round(day.tss)} TSS`}
                  aria-label={`${day.date} : ${Math.round(day.tss)} TSS`}
                  className={`block h-3 w-3 rounded-sm ${level(day.tss)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        {t('analysis.calendar.less')}
        {[0, 20, 60, 100, 150].map((v) => (
          <span key={v} className={`h-3 w-3 rounded-sm ${level(v)}`} aria-hidden="true" />
        ))}
        {t('analysis.calendar.more')}
      </div>
    </Section>
  )
}
