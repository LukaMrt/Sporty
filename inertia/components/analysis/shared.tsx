import { createContext, useContext, type ReactNode } from 'react'
import { useTranslation } from '~/hooks/use_translation'
import type { AnalysisData } from '../../../app/use_cases/analysis/get_analysis'
import type { Insight } from '../../../app/domain/services/analysis/insights'
import InsightItem from './InsightItem'
import ChartHelp, { type HelpId } from './ChartHelp'

export type { AnalysisData, Insight }

/** Couleurs des zones (identiques à HeartRateZonesChart) */
export const ZONE_COLORS = ['#9ca3af', '#60a5fa', '#34d399', '#fb923c', '#f87171']

export const SERIES_COLORS = {
  ctl: '#2563eb',
  atl: '#db2777',
  tsb: '#16a34a',
  tss: '#cbd5e1',
  primary: '#0f766e',
  secondary: '#a16207',
  projection: '#94a3b8',
}

/** Bandes de lecture des graphiques (fond léger, jamais plus saillant que la donnée) */
export const BAND_COLORS = {
  good: '#dcfce7',
  caution: '#fef3c7',
  risk: '#ffe4e6',
  neutral: '#f1f5f9',
}

export const SPORT_COLORS: Record<string, string> = {
  running: '#0f766e',
  cycling: '#2563eb',
  swimming: '#0891b2',
  walking: '#a16207',
  hiking: '#65a30d',
  other: '#94a3b8',
}

export {
  DISTANCE_KEYS,
  formatMinutes,
  formatNumber,
  formatPace,
  formatSeconds,
  formatSigned,
  longDate,
  monthLabel,
  shortDate,
} from './format'

// ── Mode expert ──────────────────────────────────────────────────────────────

/**
 * Mode normal : notions en langage courant (« Forme »). Mode expert : sigles
 * (« CTL ») et indicateurs avancés (monotonie, contrainte…).
 */
export const ExpertContext = createContext(false)

export function useExpert(): boolean {
  return useContext(ExpertContext)
}

export type MetricId =
  | 'ctl'
  | 'atl'
  | 'tsb'
  | 'acwr'
  | 'tss'
  | 'ef'
  | 'decoupling'
  | 'vdot'
  | 'monotony'
  | 'strain'
  | 'ramp'

/** Libellé d'une notion selon le mode (simple ou expert) */
export function useMetricLabel() {
  const { t } = useTranslation()
  const expert = useExpert()
  return (id: MetricId) => t(`analysis.metric.${id}.${expert ? 'expert' : 'simple'}`)
}

// ── Mise en page ─────────────────────────────────────────────────────────────

export function Section({
  id,
  title,
  description,
  verdict,
  empty,
  emptyMessage,
  emptyAction,
  actions,
  children,
}: {
  id: string
  title: string
  description?: string
  /** Constat principal de la section, affiché en tête (niveau 0 de la pédagogie) */
  verdict?: Insight
  empty?: boolean
  emptyMessage?: string
  /** Lien pour débloquer la section (profil, connecteurs…) */
  emptyAction?: { href: string; label: string }
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {verdict && !empty && (
        <div className="mt-3">
          <InsightItem insight={verdict} />
        </div>
      )}
      <div className="mt-4">
        {empty ? (
          // État vide explicite plutôt qu'un graphique vide ou faux (§22.6)
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>{emptyMessage}</p>
            {emptyAction && (
              <a href={emptyAction.href} className="mt-2 inline-block text-primary hover:underline">
                {emptyAction.label} →
              </a>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/** Titre de graphique + aide « Comment lire ? » discrète */
export function ChartBlock({
  title,
  help,
  className = '',
  children,
}: {
  title: ReactNode
  help?: HelpId
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {help && <ChartHelp id={help} />}
      </div>
      {children}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  delta,
  tone,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  /** Variation affichée sous la valeur (déjà formatée) */
  delta?: { text: string; favorable: boolean | null }
  tone?: 'good' | 'caution' | 'risk'
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'caution'
        ? 'text-amber-700'
        : tone === 'risk'
          ? 'text-rose-700'
          : ''
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {delta && (
        <div
          className={`mt-0.5 text-xs tabular-nums ${
            delta.favorable === null
              ? 'text-muted-foreground'
              : delta.favorable
                ? 'text-emerald-700'
                : 'text-amber-700'
          }`}
        >
          {delta.text}
        </div>
      )}
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Petit bouton bascule (filtres des graphiques) */
export function toggleClass(active: boolean): string {
  return `rounded-md px-2 py-1 text-xs transition ${
    active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
  }`
}
