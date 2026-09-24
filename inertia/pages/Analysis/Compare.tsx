import React, { useMemo, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { ChevronLeft } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import { formatSeconds } from '~/components/analysis/shared'
import type { ComparedSession } from '../../../app/use_cases/analysis/route_analysis'

const COLORS = ['#0f766e', '#db2777', '#2563eb', '#a16207']

type Metric = 'pace' | 'heartRate' | 'gap'

/**
 * F3 · Superposition de 2 à 4 séances alignées sur la distance : allure, FC,
 * et écart de temps cumulé par rapport à la première séance.
 */
export default function AnalysisCompare({ sessions }: { sessions: ComparedSession[] }) {
  const { t, locale } = useTranslation()
  const [metric, setMetric] = useState<Metric>('pace')

  const data = useMemo(() => {
    const byKm = new Map<number, Record<string, number | null>>()
    const reference = new Map(sessions[0]?.points.map((p) => [p.km, p.elapsed]) ?? [])
    sessions.forEach((s, i) => {
      for (const p of s.points) {
        const row = byKm.get(p.km) ?? { km: p.km }
        row[`pace${i}`] = p.pace
        row[`heartRate${i}`] = p.heartRate
        const ref = reference.get(p.km)
        row[`gap${i}`] = ref !== undefined ? p.elapsed - ref : null
        byKm.set(p.km, row)
      }
    })
    return [...byKm.values()].sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
  }, [sessions])

  const label = (s: ComparedSession) => new Date(`${s.date}T00:00:00`).toLocaleDateString(locale)

  return (
    <>
      <Head title={t('analysis.compare.title')} />
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('analysis.title')}
        </Link>
        <h1 className="text-xl font-semibold">{t('analysis.compare.title')}</h1>

        <div className="overflow-x-auto rounded-xl border bg-card p-4">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">{t('analysis.compare.session')}</th>
                <th>{t('analysis.compare.distance')}</th>
                <th>{t('analysis.compare.duration')}</th>
                <th>{t('analysis.compare.heartRate')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {sessions.map((s, i) => (
                <tr key={s.id} className="border-t">
                  <td className="py-1">
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: COLORS[i] }}
                      aria-hidden="true"
                    />
                    <Link href={`/sessions/${s.id}`} className="hover:underline">
                      {label(s)}
                    </Link>
                  </td>
                  <td>{s.distanceKm ? `${s.distanceKm.toFixed(2)} km` : '—'}</td>
                  <td>{formatSeconds(s.durationMinutes * 60)}</td>
                  <td>{s.avgHeartRate ? `${s.avgHeartRate} bpm` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div role="group" className="mb-3 flex gap-2">
            {(['pace', 'heartRate', 'gap'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric === m}
                onClick={() => setMetric(m)}
                className={`rounded-md px-2 py-1 text-xs ${metric === m ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {t(`analysis.compare.metrics.${m}`)}
              </button>
            ))}
          </div>
          {sessions.every((s) => s.points.length === 0) ? (
            <p className="text-sm text-muted-foreground">{t('analysis.empty.noGps')}</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="km" unit=" km" fontSize={11} />
                  <YAxis
                    fontSize={11}
                    reversed={metric === 'pace'}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) =>
                      metric === 'heartRate' ? String(v) : formatSeconds(v)
                    }
                  />
                  <Tooltip />
                  <Legend />
                  {sessions.map((s, i) => (
                    <Line
                      key={s.id}
                      dataKey={`${metric}${i}`}
                      name={label(s)}
                      stroke={COLORS[i]}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {metric === 'gap' && (
            <p className="mt-2 text-xs text-muted-foreground">{t('analysis.compare.gapHint')}</p>
          )}
        </div>
      </div>
    </>
  )
}

AnalysisCompare.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
