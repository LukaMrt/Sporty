import { useState } from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { sportIcon } from '~/lib/sports'
import { Switch } from '~/components/ui/switch'
import { longDate, type AnalysisData } from './shared'

const RANGES = ['3m', '6m', '12m', 'all'] as const
const COMPARE = ['previous', 'year', 'none'] as const

export type FilterParams = {
  range?: string
  from?: string
  to?: string
  sport?: string
  compare?: string
  tab?: string
}

/** Paramètres d'URL actuels de la page (pour n'en changer qu'un à la fois) */
export function currentParams(analysis: AnalysisData, tab: string): FilterParams {
  const params: FilterParams = { tab }
  if (analysis.range === 'custom') {
    params.from = analysis.from
    params.to = analysis.to
  } else params.range = analysis.range
  if (analysis.filters.sport) params.sport = analysis.filters.sport
  if (analysis.filters.compare !== 'previous') params.compare = analysis.filters.compare
  return params
}

export function applyFilters(params: FilterParams) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
  router.get('/analysis', clean, { preserveScroll: true, preserveState: true })
}

/**
 * Réglages de la page : période (préréglages ou dates libres), sport, période
 * de comparaison et mode expert. Tout passe par l'URL : une vue se partage
 * et survit au rechargement.
 */
export default function FilterBar({
  analysis,
  tab,
  expert,
  onToggleExpert,
}: {
  analysis: AnalysisData
  tab: string
  expert: boolean
  onToggleExpert: () => void
}) {
  const { t, locale } = useTranslation()
  const params = currentParams(analysis, tab)
  const [customOpen, setCustomOpen] = useState(analysis.range === 'custom')
  const [from, setFrom] = useState(analysis.from)
  const [to, setTo] = useState(analysis.to)
  const { sports } = analysis.filters

  const select =
    'rounded-md border bg-background px-2 py-1 text-sm focus:ring-2 focus:ring-ring focus:outline-none'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label={t('analysis.range')}
          className="flex gap-1 rounded-lg bg-muted p-1"
        >
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={analysis.range === range}
              onClick={() => {
                setCustomOpen(false)
                applyFilters({ ...params, from: undefined, to: undefined, range })
              }}
              className={`rounded-md px-3 py-1 text-sm ${analysis.range === range ? 'bg-background shadow-sm' : ''}`}
            >
              {t(`analysis.ranges.${range}`)}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={analysis.range === 'custom'}
            aria-expanded={customOpen}
            onClick={() => setCustomOpen((o) => !o)}
            className={`rounded-md px-3 py-1 text-sm ${analysis.range === 'custom' ? 'bg-background shadow-sm' : ''}`}
          >
            {t('analysis.ranges.custom')}
          </button>
        </div>

        {(sports.length > 1 || analysis.filters.sport) && (
          <label className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{t('analysis.filters.sport')}</span>
            <select
              className={select}
              value={analysis.filters.sport ?? ''}
              onChange={(e) => applyFilters({ ...params, sport: e.target.value || undefined })}
            >
              <option value="">{t('analysis.filters.allSports')}</option>
              {[
                ...new Set([
                  ...sports,
                  ...(analysis.filters.sport ? [analysis.filters.sport] : []),
                ]),
              ].map((sport) => (
                <option key={sport} value={sport}>
                  {sportIcon(sport)} {t(`analysis.sports.${sport}`)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">{t('analysis.filters.compare')}</span>
          <select
            className={select}
            value={analysis.filters.compare}
            onChange={(e) =>
              applyFilters({
                ...params,
                compare: e.target.value === 'previous' ? undefined : e.target.value,
              })
            }
          >
            {COMPARE.map((c) => (
              <option key={c} value={c}>
                {t(`analysis.filters.compareModes.${c}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
          <Switch checked={expert} onCheckedChange={onToggleExpert} />
          <span>{t('analysis.filters.expert')}</span>
        </label>
      </div>

      {customOpen && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (from && to && from <= to) applyFilters({ ...params, range: undefined, from, to })
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('analysis.filters.from')}</span>
            <input
              type="date"
              className={select}
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('analysis.filters.to')}</span>
            <input
              type="date"
              className={select}
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={!from || !to || from > to}
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50"
          >
            {t('analysis.filters.apply')}
          </button>
        </form>
      )}

      <p className="text-xs text-muted-foreground">
        {t('analysis.filters.summary', {
          from: longDate(analysis.from, locale),
          to: longDate(analysis.to, locale),
        })}
        {analysis.filters.comparison &&
          ` · ${t('analysis.filters.comparedTo', {
            from: longDate(analysis.filters.comparison.from, locale),
            to: longDate(analysis.filters.comparison.to, locale),
          })}`}
        {analysis.filters.sport && ` · ${t('analysis.filters.fitnessAllSports')}`}
      </p>
    </div>
  )
}
