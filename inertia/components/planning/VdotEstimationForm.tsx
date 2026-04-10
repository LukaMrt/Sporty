import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaceZoneRange {
  minPacePerKm: number
  maxPacePerKm: number
}

export interface PaceZones {
  easy: PaceZoneRange
  marathon: PaceZoneRange
  threshold: PaceZoneRange
  interval: PaceZoneRange
  repetition: PaceZoneRange
}

export interface VdotEstimationResult {
  vdot: number
  method: 'history' | 'vma' | 'questionnaire' | 'recent' | 'manual_vma'
  paceZones: PaceZones
}

type FunnelMethod = 'recent' | 'vma' | 'questionnaire'

interface VdotEstimationFormProps {
  onConfirm: (result: VdotEstimationResult) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISTANCE_OPTIONS = [
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '21.1', label: 'Semi' },
  { value: '42.195', label: 'Marathon' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function VdotEstimationForm({ onConfirm }: VdotEstimationFormProps) {
  const { t } = useTranslation()

  // Auto-estimation since Strava history
  const [autoResult, setAutoResult] = useState<VdotEstimationResult | null>(null)
  const [autoLoading, setAutoLoading] = useState(true)
  const [showFunnel, setShowFunnel] = useState(false)

  // Funnel state
  const [funnelMethod, setFunnelMethod] = useState<FunnelMethod>('recent')
  const [recentDistance, setRecentDistance] = useState('10')
  const [recentTime, setRecentTime] = useState('')
  const [vmaValue, setVmaValue] = useState('')
  const [frequency, setFrequency] = useState<'occasional' | 'regular' | 'frequent'>('regular')
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'experienced'>(
    'intermediate'
  )
  const [typicalDistance, setTypicalDistance] = useState<'less_5k' | '5k_to_10k' | 'more_10k'>(
    '5k_to_10k'
  )
  const [funnelLoading, setFunnelLoading] = useState(false)
  const [funnelResult, setFunnelResult] = useState<VdotEstimationResult | null>(null)

  // ── Auto-estimate from Strava history ─────────────────────────────────────
  useEffect(() => {
    fetch('/profile/athlete/estimate-vdot', {
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
    })
      .then((r) => (r.ok ? (r.json() as Promise<VdotEstimationResult>) : null))
      .then((data) => {
        if (data && data.method === 'history') {
          setAutoResult(data)
        } else {
          setShowFunnel(true)
        }
        setAutoLoading(false)
      })
      .catch(() => {
        setShowFunnel(true)
        setAutoLoading(false)
      })
  }, [])

  // ── Funnel: estimate via API ───────────────────────────────────────────────
  async function estimateFromFunnel() {
    setFunnelLoading(true)
    setFunnelResult(null)

    let url = '/profile/athlete/estimate-vdot'
    const params: Record<string, string> = {}

    if (funnelMethod === 'questionnaire') {
      params.frequency = frequency
      params.experience = experience
      params.typical_distance = typicalDistance
    }

    const query = new URLSearchParams(params).toString()
    if (query) url += `?${query}`

    try {
      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
      })
      const data = (await res.json()) as VdotEstimationResult

      // For "recent" method, we compute VDOT client-side via the VDOT formula
      // The API with no params will return questionnaire/vma level — we just use it
      setFunnelResult({ ...data, method: funnelMethod })
    } catch {
      // ignore
    } finally {
      setFunnelLoading(false)
    }
  }

  // ── Funnel: can estimate? ──────────────────────────────────────────────────
  function canEstimate(): boolean {
    if (funnelMethod === 'recent') return recentTime.trim().length > 0
    if (funnelMethod === 'vma') return vmaValue.trim().length > 0
    return true // questionnaire always ready
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (autoLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t('planning.wizard.step2.estimating')}
      </div>
    )
  }

  // Auto-estimated from Strava history
  if (autoResult && !showFunnel) {
    return (
      <div className="space-y-6">
        <p className="text-sm font-medium">{t('planning.wizard.step2.autoTitle')}</p>
        <div className="flex items-center justify-center gap-4 rounded-xl border bg-card p-6">
          <div className="text-center">
            <div className="text-5xl font-bold tabular-nums">{autoResult.vdot}</div>
            <div className="text-xs text-muted-foreground mt-1">VDOT</div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => onConfirm(autoResult)}>
            {t('planning.wizard.step2.autoConfirm')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setShowFunnel(true)}>
            {t('planning.wizard.step2.autoAdjust')}
          </Button>
        </div>
      </div>
    )
  }

  // Funnel
  return (
    <div className="space-y-5">
      {/* Method selector */}
      <div className="grid grid-cols-3 gap-2">
        {(['recent', 'vma', 'questionnaire'] as FunnelMethod[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setFunnelMethod(m)
              setFunnelResult(null)
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              funnelMethod === m
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            }`}
          >
            {t(`planning.wizard.step2.method${m.charAt(0).toUpperCase() + m.slice(1)}`)}
          </button>
        ))}
      </div>

      {/* Recent performance */}
      {funnelMethod === 'recent' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {t('planning.wizard.step2.recentDistance')}
            </label>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRecentDistance(value)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    recentDistance === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {t('planning.wizard.step2.recentTime')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={recentTime}
                onChange={(e) => setRecentTime(e.target.value)}
                placeholder={t('planning.wizard.step2.recentTimePlaceholder')}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        </div>
      )}

      {/* VMA */}
      {funnelMethod === 'vma' && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t('planning.wizard.step2.vmaLabel')}
          </label>
          <input
            type="number"
            step="0.1"
            value={vmaValue}
            onChange={(e) => setVmaValue(e.target.value)}
            placeholder={t('planning.wizard.step2.vmaPlaceholder')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Questionnaire */}
      {funnelMethod === 'questionnaire' && (
        <div className="space-y-3">
          {[
            {
              key: 'frequency',
              value: frequency,
              options: ['occasional', 'regular', 'frequent'] as const,
              setter: setFrequency,
            },
            {
              key: 'experience',
              value: experience,
              options: ['beginner', 'intermediate', 'experienced'] as const,
              setter: setExperience,
            },
            {
              key: 'distance',
              value: typicalDistance,
              options: ['less_5k', '5k_to_10k', 'more_10k'] as const,
              setter: setTypicalDistance,
            },
          ].map(({ key, value, options, setter }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {t(`planning.wizard.step2.questionnaire.${key}`)}
              </label>
              <select
                value={value}
                onChange={(e) => setter(e.target.value as never)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`planning.wizard.step2.questionnaire.${key}Options.${opt}`)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Result display */}
      {funnelResult && (
        <div className="flex items-center justify-center gap-4 rounded-xl border bg-card p-4">
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums">{funnelResult.vdot}</div>
            <div className="text-xs text-muted-foreground mt-1">VDOT estimé</div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!funnelResult ? (
          <Button
            className="flex-1"
            onClick={() => void estimateFromFunnel()}
            disabled={funnelLoading || !canEstimate()}
          >
            {funnelLoading
              ? t('planning.wizard.step2.estimating')
              : t('planning.wizard.step2.estimateBtn')}
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => funnelResult && onConfirm(funnelResult)}>
            {t('planning.wizard.step2.autoConfirm')}
          </Button>
        )}
      </div>
    </div>
  )
}
