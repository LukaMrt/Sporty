import { Link } from '@inertiajs/react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import Term from '~/components/shared/Term'
import { formatSwimPace, formatSwimDistance } from '~/lib/format'
import { Section, SPORT_COLORS, Stat, type AnalysisData } from './shared'

/** Natation : progression d'allure /100 m, records d'allure et CSS */
export default function SwimmingSection({ swimming }: { swimming: AnalysisData['swimming'] }) {
  const { t, locale } = useTranslation()
  const trend = swimming.paceTrend
  // Allure : plus bas = plus rapide, d'où un delta négatif = progrès
  const delta =
    trend.length >= 2
      ? Math.round(
          ((trend.at(-1)!.pacePer100m - trend[0].pacePer100m) / trend[0].pacePer100m) * 1000
        ) / 10
      : null
  const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale)

  return (
    <Section
      id="swimming"
      title={t('analysis.swimming.title')}
      description={t('analysis.swimming.description')}
      empty={!swimming.hasSessions}
      emptyMessage={t('analysis.swimming.empty')}
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label={t('analysis.swimming.lastPace')}
          value={trend.length > 0 ? formatSwimPace(trend.at(-1)!.pacePer100m) : '—'}
          hint={
            delta !== null
              ? t('analysis.swimming.delta', { delta: `${delta >= 0 ? '+' : ''}${delta}` })
              : undefined
          }
        />
        <Stat
          label={t('analysis.swimming.css')}
          value={swimming.css ? formatSwimPace(swimming.css) : '—'}
          hint={swimming.css ? undefined : t('analysis.swimming.cssMissing')}
        />
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        <Term id="swimPace" /> · <Term id="css" /> · <Term id="stss" />
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56">
          <h3 className="mb-1 text-sm font-medium">{t('analysis.swimming.paceTrend')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" fontSize={11} minTickGap={24} />
              {/* Axe inversé : plus haut = plus rapide */}
              <YAxis
                reversed
                domain={['auto', 'auto']}
                fontSize={11}
                tickFormatter={(v: number) => formatSwimPace(v).replace('/100m', '')}
              />
              <Tooltip
                formatter={(v) => formatSwimPace(Number(v))}
                labelFormatter={(l) => (typeof l === 'string' ? fmtDate(l) : '')}
              />
              {swimming.css && (
                <ReferenceLine
                  y={swimming.css}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: 'CSS', fontSize: 10, position: 'insideTopRight' }}
                />
              )}
              <Line
                dataKey="pacePer100m"
                name={t('analysis.swimming.pace')}
                stroke={SPORT_COLORS.swimming}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-medium">{t('analysis.swimming.records')}</h3>
          <p className="mb-2 text-xs text-muted-foreground">{t('analysis.swimming.recordsHint')}</p>
          {swimming.records.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {swimming.records.map((r) => (
                  <tr key={r.distance} className="border-b last:border-0">
                    <td className="py-1.5 text-muted-foreground">
                      ≥ {formatSwimDistance(r.distance / 1000)}
                    </td>
                    <td className="py-1.5 font-medium tabular-nums">
                      {formatSwimPace(r.pacePer100m)}
                    </td>
                    <td className="py-1.5 text-right">
                      <Link
                        href={`/sessions/${r.sessionId}`}
                        className="text-primary hover:underline"
                      >
                        {fmtDate(r.date)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Section>
  )
}
