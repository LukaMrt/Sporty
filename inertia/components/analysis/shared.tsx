import type { ReactNode } from 'react'
import type { AnalysisData } from '../../../app/use_cases/analysis/get_analysis'

export type { AnalysisData }

/** Couleurs des zones (identiques à HeartRateZonesChart) */
export const ZONE_COLORS = ['#9ca3af', '#60a5fa', '#34d399', '#fb923c', '#f87171']

export const SERIES_COLORS = {
  ctl: '#2563eb',
  atl: '#db2777',
  tsb: '#16a34a',
  tss: '#cbd5e1',
  primary: '#0f766e',
  secondary: '#a16207',
}

export const SPORT_COLORS: Record<string, string> = {
  running: '#0f766e',
  cycling: '#2563eb',
  swimming: '#0891b2',
  walking: '#a16207',
  hiking: '#65a30d',
  other: '#94a3b8',
}

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatPace(secondsPerKm: number): string {
  return `${formatSeconds(secondsPerKm)}/km`
}

export function shortDate(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function Section({
  id,
  title,
  description,
  empty,
  emptyMessage,
  children,
}: {
  id: string
  title: string
  description?: string
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">
        {empty ? (
          // État vide explicite plutôt qu'un graphique vide ou faux (§22.6)
          <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
