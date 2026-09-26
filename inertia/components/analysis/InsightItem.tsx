import { AlertTriangle, CircleAlert, CircleCheck, Info } from 'lucide-react'
import type { Insight } from '../../../app/domain/services/analysis/insights'
import { useInsightText } from './insight_text'

const TONES = {
  alert: { icon: AlertTriangle, className: 'border-rose-200 bg-rose-50 text-rose-900' },
  warning: { icon: CircleAlert, className: 'border-amber-200 bg-amber-50 text-amber-900' },
  positive: { icon: CircleCheck, className: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  neutral: { icon: Info, className: 'border-border bg-muted/40 text-foreground' },
} as const

/** Constat en une phrase, avec une couleur et une icône selon son ton */
export default function InsightItem({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const text = useInsightText()
  const { icon: Icon, className } = TONES[insight.tone]
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border text-sm ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} ${className}`}
      data-tone={insight.tone}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{text(insight)}</span>
    </p>
  )
}
