import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '~/hooks/use_translation'
import { Section, shortDate, type AnalysisData } from './shared'

const READINESS_STYLES = {
  good: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  moderate: 'border-amber-300 bg-amber-50 text-amber-900',
  low: 'border-rose-300 bg-rose-50 text-rose-900',
  unknown: 'border-muted bg-muted/40',
} as const

/** E1 HRV / FC repos · E2 sommeil · E3 forme du jour · E4 corrélations · E5 signaux · G1 poids · B5 activité */
export default function RecoverySection({
  recovery,
  correlations,
  hasWellness,
}: {
  recovery: AnalysisData['recovery']
  correlations: AnalysisData['correlations']
  hasWellness: boolean
}) {
  const { t, locale } = useTranslation()
  const trend = recovery.trend.map((p) => ({
    ...p,
    band: p.hrvBand ? [Math.round(p.hrvBand.low), Math.round(p.hrvBand.high)] : null,
  }))
  const sleep = recovery.sleep.map((d) => ({
    date: d.date,
    deep: d.sleepDeepMinutes,
    rem: d.sleepRemMinutes,
    light: d.sleepLightMinutes,
    awake: d.sleepAwakeMinutes,
    total: d.sleepDeepMinutes === null ? d.sleepMinutes : null,
  }))

  return (
    <Section
      id="recovery"
      terms={['readiness', 'hrv', 'restingHr', 'spo2', 'tsb']}
      title={t('analysis.recovery.title')}
      description={t('analysis.recovery.description')}
      empty={!hasWellness}
      emptyMessage={t('analysis.empty.noWellness')}
    >
      <div
        className={`mb-4 rounded-lg border p-3 text-sm ${READINESS_STYLES[recovery.readiness.level]}`}
      >
        <div className="font-medium">
          {t('analysis.recovery.readiness')} :{' '}
          {t(`analysis.recovery.levels.${recovery.readiness.level}`)}
        </div>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {recovery.readiness.components.map((c) => (
            <li key={c.key}>
              {t(`analysis.recovery.components.${c.key}`)} : {c.value ?? '—'}
              {c.reference !== null && ` (${t('analysis.recovery.usual')} ${c.reference})`}{' '}
              <span aria-hidden="true">{c.score >= 0.2 ? '▲' : c.score <= -0.3 ? '▼' : '●'}</span>
            </li>
          ))}
        </ul>
      </div>

      {(recovery.signals.length > 0 || recovery.hrvLowStreak >= 3) && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {recovery.hrvLowStreak >= 3 && (
            <p>{t('analysis.recovery.hrvLow', { days: recovery.hrvLowStreak })}</p>
          )}
          {recovery.signals.map((s) => (
            <p key={s}>{t(`analysis.recovery.signals.${s}`)}</p>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56">
          <h3 className="mb-1 text-sm font-medium">{t('analysis.recovery.hrv')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => shortDate(d, locale)}
                fontSize={11}
                minTickGap={32}
              />
              <YAxis fontSize={11} />
              <Tooltip labelFormatter={(d) => shortDate(typeof d === 'string' ? d : '', locale)} />
              <Area
                dataKey="band"
                name={t('analysis.recovery.normalBand')}
                fill="#dbeafe"
                stroke="none"
              />
              <Line dataKey="hrv" name="HRV" stroke="#93c5fd" dot={false} />
              <Line
                dataKey="hrv7"
                name={t('analysis.recovery.avg7')}
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="h-56">
          <h3 className="mb-1 text-sm font-medium">{t('analysis.recovery.restingHr')}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => shortDate(d, locale)}
                fontSize={11}
                minTickGap={32}
              />
              <YAxis domain={['auto', 'auto']} fontSize={11} />
              <Tooltip labelFormatter={(d) => shortDate(typeof d === 'string' ? d : '', locale)} />
              <Line dataKey="restingHr" stroke="#fda4af" dot={false} />
              <Line dataKey="restingHr7" stroke="#db2777" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {sleep.length > 0 && (
          <div className="h-56">
            <h3 className="mb-1 text-sm font-medium">{t('analysis.recovery.sleep')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleep}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => shortDate(d, locale)}
                  fontSize={11}
                  minTickGap={32}
                />
                <YAxis fontSize={11} unit=" min" />
                <Tooltip
                  labelFormatter={(d) => shortDate(typeof d === 'string' ? d : '', locale)}
                />
                <Legend />
                <Bar
                  dataKey="deep"
                  stackId="s"
                  name={t('analysis.recovery.stages.deep')}
                  fill="#1e3a8a"
                />
                <Bar
                  dataKey="rem"
                  stackId="s"
                  name={t('analysis.recovery.stages.rem')}
                  fill="#7c3aed"
                />
                <Bar
                  dataKey="light"
                  stackId="s"
                  name={t('analysis.recovery.stages.light')}
                  fill="#93c5fd"
                />
                <Bar
                  dataKey="awake"
                  stackId="s"
                  name={t('analysis.recovery.stages.awake')}
                  fill="#fda4af"
                />
                <Bar
                  dataKey="total"
                  stackId="s"
                  name={t('analysis.recovery.stages.total')}
                  fill="#94a3b8"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {recovery.weight.length > 0 && (
          <div className="h-56">
            <h3 className="mb-1 text-sm font-medium">{t('analysis.recovery.weight')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recovery.weight}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => shortDate(d, locale)}
                  fontSize={11}
                  minTickGap={32}
                />
                <YAxis domain={['auto', 'auto']} fontSize={11} unit=" kg" />
                <Tooltip
                  labelFormatter={(d) => shortDate(typeof d === 'string' ? d : '', locale)}
                />
                <Line dataKey="weight" stroke="#cbd5e1" dot={{ r: 2 }} />
                <Line dataKey="trend" stroke="#0f172a" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {recovery.activity.length > 0 && (
          <div className="h-56">
            <h3 className="mb-1 text-sm font-medium">{t('analysis.recovery.activity')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recovery.activity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => shortDate(d, locale)}
                  fontSize={11}
                  minTickGap={32}
                />
                <YAxis fontSize={11} />
                <Tooltip
                  labelFormatter={(d) => shortDate(typeof d === 'string' ? d : '', locale)}
                />
                <Bar
                  dataKey="activeMinutes"
                  name={t('analysis.recovery.activeMinutes')}
                  fill="#65a30d"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {correlations.sleepVsEfficiency.length >= 5 && (
          <div className="h-56">
            <h3 className="mb-1 text-sm font-medium">
              {t('analysis.recovery.correlation', { r: correlations.coefficient ?? '—' })}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="sleepMinutes"
                  name={t('analysis.recovery.sleep')}
                  unit=" min"
                  fontSize={11}
                />
                <YAxis dataKey="ef" name="EF" domain={['auto', 'auto']} fontSize={11} />
                <Tooltip />
                <Scatter data={correlations.sleepVsEfficiency} fill="#0f766e" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Section>
  )
}
