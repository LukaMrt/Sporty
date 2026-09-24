import { router } from '@inertiajs/react'
import {
  Bar,
  BarChart,
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
import { Section, formatPace, type AnalysisData } from './shared'

/** D1 efficacité aérobie · D2 découplage · D3 FC à allure de référence */
export default function EfficiencySection({
  efficiency,
  range,
}: {
  efficiency: AnalysisData['efficiency']
  range: string
}) {
  const { t } = useTranslation()
  const trend = efficiency.trend
  const delta =
    trend.length >= 2
      ? Math.round(((trend.at(-1)!.ef - trend[0].ef) / trend[0].ef) * 1000) / 10
      : null

  function changePace(deltaSeconds: number) {
    if (efficiency.referencePace === null) return
    router.get(
      '/analysis',
      { range, pace: efficiency.referencePace + deltaSeconds },
      { preserveScroll: true, preserveState: true, only: ['analysis'] }
    )
  }

  return (
    <Section
      id="efficiency"
      title={t('analysis.efficiency.title')}
      description={t('analysis.efficiency.description')}
      empty={trend.length === 0 && efficiency.decoupling.length === 0}
      emptyMessage={t('analysis.empty.noHeartRate')}
    >
      {delta !== null && (
        <p className="mb-2 text-sm">
          {t('analysis.efficiency.delta', { delta: `${delta >= 0 ? '+' : ''}${delta}` })}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56">
          <h3 className="mb-1 text-sm font-medium">{t('analysis.efficiency.ef')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" fontSize={11} minTickGap={24} />
              <YAxis domain={['auto', 'auto']} fontSize={11} />
              <Tooltip />
              <Line dataKey="ef" stroke="#0f766e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="h-56">
          <h3 className="mb-1 text-sm font-medium">{t('analysis.efficiency.decoupling')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efficiency.decoupling}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={11} minTickGap={24} />
              <YAxis fontSize={11} unit="%" />
              <Tooltip />
              <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="4 2" />
              <Bar dataKey="decoupling" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {efficiency.referencePace !== null && (
        <div className="mt-8">
          <div className="mb-1 flex items-center gap-2 text-sm">
            <h3 className="font-medium">
              {t('analysis.efficiency.hrAtPace', { pace: formatPace(efficiency.referencePace) })}
            </h3>
            <button
              type="button"
              className="rounded bg-muted px-2"
              onClick={() => changePace(-10)}
              aria-label={t('analysis.efficiency.faster')}
            >
              −10 s
            </button>
            <button
              type="button"
              className="rounded bg-muted px-2"
              onClick={() => changePace(10)}
              aria-label={t('analysis.efficiency.slower')}
            >
              +10 s
            </button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efficiency.heartRateAtPace}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis domain={['auto', 'auto']} fontSize={11} unit=" bpm" />
                <Tooltip />
                <Line dataKey="heartRate" stroke="#db2777" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Section>
  )
}
